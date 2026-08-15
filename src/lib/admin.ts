"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import type { ApiFailure, ApiSuccess, PaginationMeta, Role } from "./types";

/**
 * The CMS's link to the API.
 *
 * Everything here runs in the browser, which is the opposite of `lib/api.ts`:
 * the public site fetches on the server so its content is indexable, while the
 * CMS is behind a login, renders nothing a crawler should see, and needs the
 * signed-in user's access token on every call. Sharing one client between them
 * would mean the wrong caching and the wrong auth in one half or the other.
 *
 * The token is never stored — `getToken()` comes from `AuthProvider`, which
 * keeps it in memory and re-mints it from the httpOnly refresh cookie a minute
 * before it expires.
 */

const API = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")}/api/v1`;

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "AdminApiError";
  }

  /** Field-keyed messages, ready to hand to a form. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) map[detail.field] = detail.message;
    return map;
  }

  get isAuth() {
    return this.status === 401 || this.status === 403;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Both halves of a paginated response, since the CMS always shows counts. */
export interface Paged<T> {
  data: T;
  meta: PaginationMeta;
}

export interface AdminClient {
  get<T>(path: string, query?: Query): Promise<T>;
  getPaged<T>(path: string, query?: Query): Promise<Paged<T>>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  /** `multipart/form-data`; used by media upload and research PDFs. */
  upload<T>(path: string, form: FormData): Promise<T>;
  /** Absolute URL, for links that leave the app (CSV exports). */
  url(path: string, query?: Query): string;
  /** A one-shot token, for an export link that must carry auth. */
  token(): Promise<string | null>;
}

function createAdminClient(getToken: () => Promise<string | null>): AdminClient {
  async function raw(
    method: string,
    path: string,
    init: { body?: unknown; form?: FormData; query?: Query } = {}
  ): Promise<unknown> {
    const token = await getToken();

    let response: Response;
    try {
      response = await fetch(`${API}${withQuery(path, init.query)}`, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          // FormData must set its own boundary — never set Content-Type here.
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      });
    } catch {
      throw new AdminApiError(0, "NETWORK_ERROR", "Could not reach the API. Check your connection.");
    }

    if (response.status === 204) return { success: true, data: null };

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AdminApiError(
        response.status,
        "INTERNAL_ERROR",
        `The API returned a non-JSON response (${response.status}).`
      );
    }

    if (!response.ok || (payload as ApiFailure)?.success === false) {
      const failure = payload as ApiFailure;
      throw new AdminApiError(
        response.status,
        failure?.error?.code ?? "INTERNAL_ERROR",
        failure?.error?.message ?? `Request failed with ${response.status}.`,
        failure?.error?.details
      );
    }

    return payload;
  }

  // Parameters are annotated rather than inferred from `AdminClient`:
  // TypeScript does not contextually type the parameters of a *generic* method
  // in an object literal, so leaving them bare makes every one `any`.
  return {
    async get<T>(path: string, query?: Query) {
      return ((await raw("GET", path, { query })) as ApiSuccess<T>).data;
    },
    async getPaged<T>(path: string, query?: Query) {
      const result = (await raw("GET", path, { query })) as ApiSuccess<T>;
      return {
        data: result.data,
        meta: result.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    async post<T>(path: string, body?: unknown) {
      return ((await raw("POST", path, { body: body ?? {} })) as ApiSuccess<T>).data;
    },
    async patch<T>(path: string, body: unknown) {
      return ((await raw("PATCH", path, { body })) as ApiSuccess<T>).data;
    },
    async del<T>(path: string) {
      return ((await raw("DELETE", path)) as ApiSuccess<T>).data;
    },
    async upload<T>(path: string, form: FormData) {
      return ((await raw("POST", path, { form })) as ApiSuccess<T>).data;
    },
    url(path: string, query?: Query) {
      return `${API}${withQuery(path, query)}`;
    },
    token: getToken,
  };
}

export function useApi(): AdminClient {
  const { getToken } = useAuth();
  return useMemo(() => createAdminClient(getToken), [getToken]);
}

// ═══════════════════════ permissions ═══════════════════════

/**
 * Mirrors `plugins/rbac.ts` on the backend. This is a convenience for hiding
 * navigation a user cannot use — it is not the enforcement. Every guarded route
 * is checked again server-side, and a hand-typed URL fails there.
 */
export const EDITOR_MODULES = ["posts", "research", "gallery", "videos"] as const;
export type EditorModule = (typeof EDITOR_MODULES)[number];

export interface Viewer {
  role: Role;
  editorModules: string[];
}

export function isStaff(viewer: Viewer | null | undefined): boolean {
  return !!viewer && viewer.role !== "MEMBER";
}

/** ADMIN and above pass everything; an EDITOR needs the module granted. */
export function canEditModule(viewer: Viewer | null | undefined, module: EditorModule): boolean {
  if (!viewer) return false;
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "ADMIN") return true;
  if (viewer.role === "EDITOR") return viewer.editorModules.includes(module);
  return false;
}

export function isAdmin(viewer: Viewer | null | undefined): boolean {
  return viewer?.role === "SUPER_ADMIN" || viewer?.role === "ADMIN";
}

export function isSuperAdmin(viewer: Viewer | null | undefined): boolean {
  return viewer?.role === "SUPER_ADMIN";
}

// ═══════════════════════ admin-only shapes ═══════════════════════

export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  researchCount: number;
  galleryCount: number;
  videosCount: number;
  usersCount: number;
  unreadMessages: number;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "WHITELISTED" | "ACTIVE" | "SUSPENDED";
  editorModules: string[];
  isProtected?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface RedirectRule {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isAuto: boolean;
  createdAt: string;
}

export interface ResearchFileRow {
  id: string;
  label: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  pageCount: number | null;
  order: number;
}
