"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LogIn, Monitor, ShieldCheck } from "lucide-react";
import { authedFetch, useAuth } from "@/components/providers/AuthProvider";
import { Button, buttonClass } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";

interface Session {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
}

export function AccountPanel() {
  const { user, loading, signIn, signOut, getToken } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const response = await authedFetch(getToken, "/me/sessions");
      if (!response.ok) return;
      const payload = await response.json();
      setSessions(payload?.data?.sessions ?? payload?.data ?? []);
    } catch {
      /* the panel still works without the session list */
    }
  }, [getToken]);

  useEffect(() => {
    if (user) void loadSessions();
  }, [user, loadSessions]);

  const revoke = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const response = await authedFetch(getToken, `/me/sessions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not end that session.");
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not end that session.");
    } finally {
      setBusy(null);
    }
  };

  const signOutEverywhere = async () => {
    setBusy("all");
    try {
      await authedFetch(getToken, "/auth/logout-all", { method: "POST" });
      await signOut();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-10 flex items-center gap-2 text-ink-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mt-10 max-w-md rounded-[var(--radius-card)] border border-dashed border-line-strong p-8 text-center">
        <ShieldCheck className="mx-auto size-8 text-flame-500" aria-hidden />
        <h2 className="mt-4 text-lg">You are not signed in</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sign in with Google to like posts, leave responses, and read the full text of papers.
        </p>
        <button type="button" onClick={() => signIn("/account")} className={buttonClass("primary", "md", "mt-6")}>
          <LogIn className="size-4" aria-hidden />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-12">
      <section className="lg:col-span-5">
        <h2 className="text-lg">Profile</h2>
        <dl className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface-raised p-6">
          <Row label="Name">{user.name}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Role">{user.role.replace("_", " ").toLowerCase()}</Row>
          <Row label="Member since">{formatDate(user.createdAt)}</Row>
        </dl>

        <Button variant="secondary" className="mt-4" onClick={() => void signOut()}>
          Sign out
        </Button>
      </section>

      <section className="lg:col-span-7">
        <h2 className="text-lg">Active sessions</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Each sign-in creates a session that lasts 30 days. Ending one signs that device out
          immediately.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-flame-700 dark:text-flame-300">
            {error}
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface-raised p-4"
            >
              <Monitor className="size-4 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{session.userAgent ?? "Unknown device"}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Started {formatDate(session.createdAt)}
                  {session.ip ? ` · ${session.ip}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revoke(session.id)}
                disabled={busy === session.id}
              >
                End
              </Button>
            </li>
          ))}
          {!sessions.length ? (
            <li className="text-sm text-ink-muted">No other sessions listed.</li>
          ) : null}
        </ul>

        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={signOutEverywhere}
          disabled={busy === "all"}
        >
          {busy === "all" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Sign out everywhere
        </Button>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="w-32 shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words capitalize">{children}</dd>
    </div>
  );
}
