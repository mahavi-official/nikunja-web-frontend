"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  Images,
  Inbox,
  Film,
  PenLine,
  Plus,
  Users,
} from "lucide-react";
import {
  AdminLinkButton,
  ErrorNote,
  Panel,
  Spinner,
  StatusPill,
} from "@/components/admin/ui";
import { useAsync } from "@/components/admin/useAsync";
import { useApi, type AuditEntry, type DashboardStats } from "@/lib/admin";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn, formatDate } from "@/lib/format";

/**
 * The landing screen. Two questions answered above the fold: how much is
 * published, and what has changed lately. Everything else is one click away in
 * the rail, so this stays a summary rather than becoming a second navigation.
 */

const TILES = [
  {
    key: "publishedPosts" as const,
    label: "Published posts",
    sub: (stats: DashboardStats) => `${stats.draftPosts} in draft`,
    href: "/admin/posts",
    Icon: FileText,
  },
  {
    key: "researchCount" as const,
    label: "Publications",
    sub: () => "Papers and abstracts",
    href: "/admin/research",
    Icon: BookOpen,
  },
  {
    key: "galleryCount" as const,
    label: "Gallery segments",
    sub: () => "Photographic sets",
    href: "/admin/gallery",
    Icon: Images,
  },
  {
    key: "videosCount" as const,
    label: "Videos",
    sub: () => "Talks and recordings",
    href: "/admin/videos",
    Icon: Film,
  },
  {
    key: "usersCount" as const,
    label: "Accounts",
    sub: () => "Staff and readers",
    href: "/admin/users",
    Icon: Users,
  },
  {
    key: "unreadMessages" as const,
    label: "Unread messages",
    sub: () => "From the contact form",
    href: "/admin/messages",
    Icon: Inbox,
    /** The one tile that should catch the eye when it is not zero. */
    alert: true,
  },
];

/**
 * Turns a dotted audit action into a readable phrase: `post.publish` →
 * "published a post". Auth actions name no object, so they are listed
 * separately rather than being forced through the same template.
 */
function describeAction(action: string): string {
  const AUTH: Record<string, string> = {
    "auth.login": "signed in",
    "auth.logout": "signed out",
    "auth.logout_all": "signed out everywhere",
    "auth.refresh": "renewed a session",
    "auth.refresh_reuse_detected": "triggered a token-reuse alert",
  };
  if (AUTH[action]) return AUTH[action];

  const [entity, verb] = action.split(".");
  const VERBS: Record<string, string> = {
    create: "created",
    update: "updated",
    delete: "deleted",
    publish: "published",
    unpublish: "unpublished",
    upload: "uploaded",
    suspend: "suspended",
    activate: "activated",
  };

  // `gallerySegment` → "gallery segment"; `research.file.view` → "research file".
  const noun = entity
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
  const tail = VERBS[verb] ?? verb?.replace(/[._]/g, " ") ?? "changed";

  return `${tail} a ${noun}`;
}

export default function AdminDashboard() {
  const api = useApi();
  const { user } = useAuth();

  const stats = useAsync(() => api.get<DashboardStats>("/admin/dashboard/stats"), []);
  // The endpoint returns a fixed 20; the panel shows the newest dozen.
  const activity = useAsync(
    () => api.get<{ activity: AuditEntry[] }>("/admin/dashboard/activity"),
    []
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Good to see you, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Everything published on radhakundah.com is managed from here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminLinkButton href="/admin/posts/new" tone="primary">
            <Plus className="size-4" aria-hidden />
            New post
          </AdminLinkButton>
          <AdminLinkButton href="/admin/research/new" tone="secondary">
            <PenLine className="size-4" aria-hidden />
            New publication
          </AdminLinkButton>
        </div>
      </header>

      {stats.error ? <ErrorNote error={stats.error} onRetry={stats.reload} /> : null}

      {stats.loading && !stats.data ? (
        <Spinner label="Loading your dashboard" />
      ) : stats.data ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((tile) => {
            const value = stats.data![tile.key];
            const highlight = tile.alert && value > 0;

            return (
              <li key={tile.key}>
                <Link
                  href={tile.href}
                  className={cn(
                    "group flex items-start gap-4 rounded-2xl border bg-surface-raised p-5 transition-all",
                    highlight
                      ? "border-flame-300 bg-flame-50/50 hover:border-flame-400 dark:bg-flame-950/20"
                      : "border-line hover:-translate-y-0.5 hover:border-flame-300 hover:shadow-[0_1px_2px_rgb(11_20_48_/_0.04),0_10px_30px_-14px_rgb(11_20_48_/_0.18)]"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      highlight
                        ? "bg-flame-500 text-white"
                        : "bg-navy-50 text-navy-700 dark:bg-navy-900 dark:text-navy-200"
                    )}
                  >
                    <tile.Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xl font-semibold text-ink tabular-nums">
                      {value}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] font-medium text-ink">
                      {tile.label}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
                      {tile.sub(stats.data!)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-6">
        <Panel
          title="Recent activity"
          description="Every change made through the studio, newest first."
          actions={
            <Link
              href="/admin/audit"
              className="text-[0.8125rem] font-medium text-flame-600 transition-colors hover:text-flame-700"
            >
              Full audit log
            </Link>
          }
          bodyClassName="p-0"
        >
          {activity.error ? (
            <div className="p-5">
              <ErrorNote error={activity.error} onRetry={activity.reload} />
            </div>
          ) : activity.loading && !activity.data ? (
            <Spinner label="Loading activity" />
          ) : activity.data?.activity.length ? (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {activity.data.activity.slice(0, 12).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-800 text-[0.6875rem] font-semibold text-white">
                    {entry.user?.name?.[0]?.toUpperCase() ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    <span className="font-medium">{entry.user?.name ?? "System"}</span>{" "}
                    <span className="text-ink-soft">{describeAction(entry.action)}</span>
                  </span>
                  <time
                    dateTime={entry.createdAt}
                    className="shrink-0 text-[0.75rem] text-ink-muted tabular-nums"
                  >
                    {formatDate(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              Nothing has been changed yet.
            </p>
          )}
        </Panel>
      </div>

      {stats.data && stats.data.draftPosts > 0 ? (
        <p className="mt-4 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
          <StatusPill status="DRAFT" />
          {stats.data.draftPosts} {stats.data.draftPosts === 1 ? "post is" : "posts are"} still
          unpublished.{" "}
          <Link href="/admin/posts?status=DRAFT" className="font-medium text-flame-600 hover:text-flame-700">
            Review them
          </Link>
        </p>
      ) : null}
    </>
  );
}
