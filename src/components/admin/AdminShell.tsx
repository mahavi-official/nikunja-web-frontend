"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Film,
  Gauge,
  Images,
  Inbox,
  LayoutTemplate,
  Link2,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import { AdminButton, Spinner, ToastProvider } from "./ui";
import { LogoMark } from "@/components/site/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { canEditModule, isAdmin, isStaff, isSuperAdmin, type Viewer } from "@/lib/admin";
import { cn } from "@/lib/format";

/**
 * The CMS shell: the sign-in gate, the navigation, and the frame everything
 * else renders into.
 *
 * The gate here is a courtesy, not a security boundary — it decides what to
 * *show*. Every endpoint behind these screens re-checks the caller's role, so a
 * MEMBER who types `/admin/users` sees the page chrome and then a 403 from the
 * API rather than anyone's data.
 */

type Guard = (viewer: Viewer) => boolean;

interface NavItem {
  href: string;
  label: string;
  Icon: typeof FileText;
  guard: Guard;
  /** Matched as a prefix so `/admin/posts/abc` still lights up "Articles". */
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", Icon: Gauge, guard: isStaff, exact: true },
    ],
  },
  {
    title: "Content",
    items: [
      {
        href: "/admin/posts",
        label: "Articles & blogs",
        Icon: FileText,
        guard: (viewer) => canEditModule(viewer, "posts"),
      },
      {
        href: "/admin/research",
        label: "Research",
        Icon: BookOpen,
        guard: (viewer) => canEditModule(viewer, "research"),
      },
      {
        href: "/admin/authors",
        label: "Authors",
        Icon: UserCog,
        guard: (viewer) => canEditModule(viewer, "research"),
      },
      {
        href: "/admin/gallery",
        label: "Gallery",
        Icon: Images,
        guard: (viewer) => canEditModule(viewer, "gallery"),
      },
      {
        href: "/admin/videos",
        label: "Videos",
        Icon: Film,
        guard: (viewer) => canEditModule(viewer, "videos"),
      },
      {
        href: "/admin/taxonomy",
        label: "Categories & tags",
        Icon: Tags,
        guard: (viewer) => canEditModule(viewer, "posts"),
      },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/hero", label: "Hero slides", Icon: Sparkles, guard: isStaff },
      { href: "/admin/pages", label: "Pages", Icon: LayoutTemplate, guard: isStaff },
      { href: "/admin/media", label: "Media library", Icon: Images, guard: isStaff },
    ],
  },
  {
    title: "Audience",
    items: [
      { href: "/admin/messages", label: "Messages", Icon: Inbox, guard: isAdmin },
      { href: "/admin/subscribers", label: "Subscribers", Icon: Mail, guard: isAdmin },
      { href: "/admin/comments", label: "Comments", Icon: MessageSquare, guard: isStaff },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users", label: "Users", Icon: Users, guard: isAdmin },
      { href: "/admin/redirects", label: "Redirects", Icon: Link2, guard: isSuperAdmin },
      { href: "/admin/settings", label: "Settings", Icon: Settings, guard: isSuperAdmin },
      { href: "/admin/audit", label: "Audit log", Icon: ScrollText, guard: isAdmin },
    ],
  },
];

function Sidebar({ viewer, onNavigate }: { viewer: Viewer; onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="flex h-full flex-col bg-navy-950 text-navy-100">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <LogoMark className="size-8" />
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold text-white">Radhakundah</span>
          <span className="mt-0.5 text-[0.5625rem] font-semibold tracking-[0.2em] text-flame-400 uppercase">
            Content studio
          </span>
        </span>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((item) => item.guard(viewer));
          if (!items.length) return null;

          return (
            <div key={group.title} className="mb-5">
              <h2 className="px-3 pb-2 text-[0.625rem] font-semibold tracking-[0.16em] text-navy-400 uppercase">
                {group.title}
              </h2>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-flame-500 text-white"
                            : "text-navy-200 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.Icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
          View the site
        </Link>
      </div>
    </div>
  );
}

/** Sign-in gate. Nothing below it renders until we know who is asking. */
function Gate({ children }: { children: (viewer: Viewer) => React.ReactNode }) {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface px-6">
        <div className="w-full max-w-sm text-center">
          <LogoMark className="mx-auto size-12" />
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">Content studio</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Sign in with the Google account your editor access is registered to.
          </p>
          <AdminButton className="mt-8 w-full" onClick={() => signIn("/admin")}>
            Sign in with Google
          </AdminButton>
          <Link
            href="/"
            className="mt-4 inline-block text-[0.8125rem] text-ink-muted transition-colors hover:text-flame-600"
          >
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  if (!isStaff(user)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface px-6">
        <div className="w-full max-w-md text-center">
          <ShieldCheck className="mx-auto size-10 text-ink-muted" aria-hidden />
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink">No editor access</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            You are signed in as <span className="font-medium text-ink">{user.email}</span>, which is
            a reader account. An administrator can grant you editor access from the users screen.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <AdminButton tone="secondary" onClick={() => signOut()}>
              <LogOut className="size-4" aria-hidden />
              Sign out
            </AdminButton>
            <Link href="/" className="contents">
              <AdminButton tone="ghost">Back to the site</AdminButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <ToastProvider>
      <Gate>
        {(viewer) => (
          <div className="min-h-dvh bg-surface-sunken">
            {/* Fixed rail on desktop. */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
              <Sidebar viewer={viewer} />
            </aside>

            {/* Slide-over on small screens. */}
            <div
              className={cn("fixed inset-0 z-50 lg:hidden", menuOpen ? "" : "pointer-events-none")}
              aria-hidden={!menuOpen}
            >
              <div
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "absolute inset-0 bg-navy-950/50 transition-opacity duration-300",
                  menuOpen ? "opacity-100" : "opacity-0"
                )}
              />
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-72 transition-transform duration-300 ease-out",
                  menuOpen ? "translate-x-0" : "-translate-x-full"
                )}
              >
                <Sidebar viewer={viewer} onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>

            <div className="lg:pl-64">
              <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/85 px-4 backdrop-blur-xl md:px-8">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                  className="grid size-10 place-items-center rounded-lg text-ink transition-colors hover:bg-surface-sunken lg:hidden"
                >
                  <Menu className="size-5" />
                </button>

                <div className="hidden min-w-0 lg:block" />

                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden min-w-0 text-right sm:block">
                    <p className="truncate text-[0.8125rem] font-medium text-ink">{user?.name}</p>
                    <p className="truncate text-[0.6875rem] text-ink-muted">{user?.email}</p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-800 text-[0.8125rem] font-semibold text-white">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    aria-label="Sign out"
                    className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              </header>

              <main className="px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        )}
      </Gate>
    </ToastProvider>
  );
}

/** Renders `children` only when the viewer passes, otherwise a stated refusal. */
export function RequirePermission({
  allow,
  children,
}: {
  allow: Guard;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !allow(user)) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong px-6 py-20 text-center">
        <ShieldCheck className="mx-auto size-8 text-ink-muted" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-ink">Not available to your role</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          This section needs a permission your account does not have. Ask an administrator if you
          think that is wrong.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export { isAdmin, isStaff, isSuperAdmin, canEditModule };
