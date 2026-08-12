"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Me } from "@/lib/types";

/**
 * Member session, browser side.
 *
 * The access token lives in memory and nowhere else — never localStorage, never
 * a readable cookie. It is recovered on load by exchanging the httpOnly refresh
 * cookie, and re-minted a minute before its 15-minute expiry.
 *
 * Nothing indexable depends on this. Signed-out visitors read the entire site.
 */

const API = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")}/api/v1`;

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_MARGIN_MS = 60 * 1000;

interface AuthState {
  user: Me | null;
  /** True until the first refresh attempt settles. */
  loading: boolean;
  signIn: (returnTo?: string) => void;
  signOut: () => Promise<void>;
  /** A valid access token, refreshing first if needed. Null when signed out. */
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useRef<string | null>(null);
  const expiresAt = useRef(0);
  const inFlight = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      try {
        const response = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) throw new Error("refresh rejected");

        const body = await response.json();
        const accessToken: string | undefined = body?.data?.accessToken;
        if (!accessToken) throw new Error("no token in refresh response");

        token.current = accessToken;
        expiresAt.current = Date.now() + ACCESS_TOKEN_TTL_MS;

        const profile = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: "include",
        });
        if (profile.ok) {
          const me = await profile.json();
          setUser(me?.data ?? null);
        }
        return accessToken;
      } catch {
        token.current = null;
        expiresAt.current = 0;
        setUser(null);
        return null;
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getToken = useCallback(async () => {
    if (token.current && Date.now() < expiresAt.current - REFRESH_MARGIN_MS) {
      return token.current;
    }
    return refresh();
  }, [refresh]);

  const signIn = useCallback((returnTo?: string) => {
    const target = returnTo ?? window.location.pathname + window.location.search;
    sessionStorage.setItem("radhakundah:returnTo", target);
    window.location.href = `${API}/auth/google`;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      token.current = null;
      expiresAt.current = 0;
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, getToken }),
    [user, loading, signIn, signOut, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Authenticated fetch against the API, used by likes, comments, and PDF access. */
export async function authedFetch(
  getToken: () => Promise<string | null>,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  return fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
