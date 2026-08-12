import { cache } from "react";
import type {
  ApiErrorCode,
  ApiFailure,
  ApiSuccess,
  Author,
  Category,
  Comment,
  GallerySegment,
  HomePayload,
  Media,
  Page,
  AboutSections,
  PaginationMeta,
  Post,
  Research,
  SearchResult,
  Seo,
  Settings,
  Tag,
  UrlRedirect,
  Video,
  VideoCategory,
} from "./types";

/**
 * The one place that talks to the backend.
 *
 * Rules that hold everywhere:
 *   - Server components only. Content that must be indexed is never fetched
 *     from the browser.
 *   - Every read declares `revalidate` and a cache tag.
 *   - Failures throw `ApiError`; pages turn a 404 into `notFound()`.
 */

const API_BASE = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

export const API_V1 = `${API_BASE}/api/v1`;

/** Browser-facing origin — used for sign-in redirects and member actions. */
export const PUBLIC_API_V1 = `${(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "")}/api/v1`;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

/** How long each family of reads may go stale. Listings move; About does not. */
export const REVALIDATE = {
  listing: 60,
  detail: 300,
  static: 3600,
} as const;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | "NETWORK_ERROR",
    message: string,
    readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound() {
    return this.status === 404 || this.code === "NOT_FOUND";
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

interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  query?: Query;
  /** Bypass the data cache entirely (member-scoped reads). */
  noStore?: boolean;
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<ApiSuccess<T>> {
  const url = `${API_V1}${withQuery(path, options.query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.noStore
        ? { cache: "no-store" as const }
        : {
            next: {
              revalidate: options.revalidate ?? REVALIDATE.listing,
              tags: options.tags,
            },
          }),
    });
  } catch {
    throw new ApiError(503, "NETWORK_ERROR", `Could not reach the API at ${url}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(response.status, "INTERNAL_ERROR", "The API returned a non-JSON response");
  }

  if (!response.ok || (body as ApiFailure)?.success === false) {
    const failure = body as ApiFailure;
    throw new ApiError(
      response.status,
      failure?.error?.code ?? "INTERNAL_ERROR",
      failure?.error?.message ?? `Request failed with ${response.status}`,
      failure?.error?.details
    );
  }

  return body as ApiSuccess<T>;
}

/** Unwraps `{ data }` and drops `meta`. */
async function getData<T>(path: string, options?: FetchOptions): Promise<T> {
  return (await apiFetch<T>(path, options)).data;
}

/** Keeps `meta` — for anything paginated. */
async function getPage<T>(
  path: string,
  options?: FetchOptions
): Promise<{ data: T; meta: PaginationMeta }> {
  const result = await apiFetch<T>(path, options);
  return {
    data: result.data,
    meta: result.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * Anything that survives an API outage without taking the page down with it —
 * settings, nav taxonomies, homepage rails on a cold start.
 */
function emptyPage<T>(data: T, limit = 20) {
  return { data, meta: { page: 1, limit, total: 0, totalPages: 0 } };
}

async function tolerate<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api] soft failure:", (error as Error).message);
    }
    return fallback;
  }
}

// ═══════════════════════════ site chrome ═══════════════════════════

/**
 * `cache()` dedupes this across the layout, the page body, and
 * `generateMetadata()` — one network call per request, not three.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const result = await tolerate(
    getData<{ settings: Settings }>("/public/settings", {
      revalidate: REVALIDATE.static,
      tags: ["settings"],
    }),
    { settings: {} as Settings }
  );
  return result.settings ?? {};
});

export const getCategories = cache(
  async (scope?: "ARTICLE" | "BLOG" | "RESEARCH"): Promise<Category[]> => {
    const result = await tolerate(
      getPage<{ categories: Category[] }>("/public/categories", {
        query: { scope, limit: 100 },
        revalidate: REVALIDATE.static,
        tags: ["categories"],
      }),
      { data: { categories: [] }, meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }
    );
    return result.data.categories ?? [];
  }
);

export const getVideoCategories = cache(async (): Promise<VideoCategory[]> => {
  const result = await tolerate(
    getData<{ categories: VideoCategory[] }>("/public/video-categories", {
      revalidate: REVALIDATE.static,
      tags: ["video-categories"],
    }),
    { categories: [] }
  );
  return result.categories ?? [];
});

export const getTags = cache(async (limit = 60): Promise<Tag[]> => {
  const result = await tolerate(
    getPage<{ tags: Tag[] }>("/public/tags", {
      query: { limit },
      revalidate: REVALIDATE.static,
      tags: ["tags"],
    }),
    { data: { tags: [] }, meta: { page: 1, limit, total: 0, totalPages: 0 } }
  );
  return result.data.tags ?? [];
});

// ═══════════════════════════ home ═══════════════════════════

export const getHome = cache(async (): Promise<HomePayload> =>
  tolerate(
    getData<HomePayload>("/public/home", {
      revalidate: REVALIDATE.listing,
      tags: ["home"],
    }),
    {
      hero: [],
      featuredResearch: [],
      featuredPosts: [],
      latestBlogs: [],
      latestVideos: [],
      gallery: [],
      recentUpdates: [],
    }
  )
);

// ═══════════════════════════ posts ═══════════════════════════

export interface PostListQuery {
  placement?: "ARTICLE" | "BLOG";
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const listPosts = cache(async (query: PostListQuery = {}) => {
  const result = await tolerate(
    getPage<{ posts: Post[] }>("/public/posts", {
      query: { ...query, limit: query.limit ?? 12 },
      revalidate: REVALIDATE.listing,
      tags: ["posts"],
    }),
    emptyPage({ posts: [] as Post[] }, query.limit ?? 12)
  );
  return { posts: result.data.posts ?? [], meta: result.meta };
});

export const getPost = cache(async (slug: string) =>
  getData<{ post: Post; seo: Seo }>(`/public/posts/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.detail,
    tags: ["posts", `post:${slug}`],
  })
);

// ═══════════════════════════ research ═══════════════════════════

export interface ResearchListQuery {
  category?: string;
  author?: string;
  year?: number;
  q?: string;
  page?: number;
  limit?: number;
}

export const listResearch = cache(async (query: ResearchListQuery = {}) => {
  const result = await tolerate(
    getPage<{ research: Research[] }>("/public/research", {
      query: { ...query, limit: query.limit ?? 12 },
      revalidate: REVALIDATE.listing,
      tags: ["research"],
    }),
    emptyPage({ research: [] as Research[] }, query.limit ?? 12)
  );
  return { research: result.data.research ?? [], meta: result.meta };
});

export const getResearch = cache(async (slug: string) =>
  getData<{ research: Research; seo: Seo }>(`/public/research/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.detail,
    tags: ["research", `research:${slug}`],
  })
);

// ═══════════════════════════ authors ═══════════════════════════

export const listAuthors = cache(async (page = 1, limit = 24) => {
  const result = await tolerate(
    getPage<{ authors: Author[] }>("/public/authors", {
      query: { page, limit },
      revalidate: REVALIDATE.static,
      tags: ["authors"],
    }),
    emptyPage({ authors: [] as Author[] }, limit)
  );
  return { authors: result.data.authors ?? [], meta: result.meta };
});

export const getAuthor = cache(async (slug: string) =>
  getData<{ author: Author; seo: Seo }>(`/public/authors/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.detail,
    tags: ["authors", `author:${slug}`],
  })
);

// ═══════════════════════════ gallery ═══════════════════════════

export const listGallery = cache(async (page = 1, limit = 24) => {
  const result = await tolerate(
    getPage<{ segments: GallerySegment[] }>("/public/gallery", {
      query: { page, limit },
      revalidate: REVALIDATE.listing,
      tags: ["gallery"],
    }),
    emptyPage({ segments: [] as GallerySegment[] }, limit)
  );
  return { segments: result.data.segments ?? [], meta: result.meta };
});

export const getGallerySegment = cache(async (slug: string) =>
  getData<{ segment: GallerySegment; seo: Seo }>(`/public/gallery/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.detail,
    tags: ["gallery", `gallery:${slug}`],
  })
);

// ═══════════════════════════ videos ═══════════════════════════

export const listVideos = cache(async (query: { category?: string; q?: string; page?: number; limit?: number } = {}) => {
  const result = await tolerate(
    getPage<{ videos: Video[] }>("/public/videos", {
      query: { ...query, limit: query.limit ?? 12 },
      revalidate: REVALIDATE.listing,
      tags: ["videos"],
    }),
    emptyPage({ videos: [] as Video[] }, query.limit ?? 12)
  );
  return { videos: result.data.videos ?? [], meta: result.meta };
});

export const getVideo = cache(async (slug: string) =>
  getData<{ video: Video; seo: Seo }>(`/public/videos/${encodeURIComponent(slug)}`, {
    revalidate: REVALIDATE.detail,
    tags: ["videos", `video:${slug}`],
  })
);

// ═══════════════════════════ pages & search ═══════════════════════════

export const getAboutPage = cache(async () =>
  getData<{ page: Page<AboutSections>; seo: Seo }>("/public/pages/about", {
    revalidate: REVALIDATE.static,
    tags: ["pages", "page:about"],
  })
);

export const search = cache(
  async (q: string, type: "all" | "post" | "research" | "video" = "all", page = 1) => {
    const result = await getPage<{ results: SearchResult[] }>("/public/search", {
      query: { q, type, page, limit: 20 },
      // Search results are noindex and query-shaped — never cached.
      noStore: true,
    });
    return { results: result.data.results ?? [], meta: result.meta };
  }
);

export const listComments = cache(async (postId: string, page = 1) => {
  const result = await tolerate(
    getPage<{ comments: Comment[] }>("/public/comments", {
      query: { postId, page, limit: 20 },
      revalidate: REVALIDATE.listing,
      tags: [`comments:${postId}`],
    }),
    { data: { comments: [] }, meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  );
  return { comments: result.data.comments ?? [], meta: result.meta };
});

/** Asked by middleware before letting a 404 render. */
export async function lookupRedirect(path: string): Promise<UrlRedirect | null> {
  try {
    const result = await getData<{ redirect: UrlRedirect | null }>("/public/redirects", {
      query: { path },
      revalidate: REVALIDATE.static,
      tags: ["redirects"],
    });
    return result.redirect ?? null;
  } catch {
    return null;
  }
}

// ═══════════════════════════ writes ═══════════════════════════

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  /** Honeypot — must stay empty. */
  website?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_V1}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(
      response.status,
      failure?.error?.code ?? "INTERNAL_ERROR",
      failure?.error?.message ?? "Something went wrong. Please try again.",
      failure?.error?.details
    );
  }

  return payload.data;
}

export function submitContact(payload: ContactPayload) {
  return post<{ message: string }>("/public/contact", payload);
}

export function subscribeNewsletter(email: string) {
  return post<{ message: string }>("/public/newsletter/subscribe", { email });
}

/** Fire-and-forget view counter. Never blocks a render. */
export async function recordView(kind: "posts" | "videos", slug: string) {
  try {
    await fetch(`${API_V1}/public/${kind}/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    /* a missed view count is not worth an error */
  }
}

export type { Media };
