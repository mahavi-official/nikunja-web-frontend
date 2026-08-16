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
  Home,
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
import { ThemeToggle } from "@/components/site/ThemeToggle";
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
    <div className="flex h-full flex-col border-r border-white/10 bg-navy-950 text-navy-100">
      {/* `px-6` here against the nav's `px-3` + each row's own `px-3`: the
          logo, every icon and the group labels all start on the same 24px
          line down the rail. Change one of the three and you break it. */}
      <div className="mandala-field relative flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-white/10 px-6">
        <LogoMark className="relative size-8 shrink-0" />
        <span className="relative flex min-w-0 flex-col leading-none">
          <span className="font-display text-lg font-semibold text-white">Radhakundah</span>
          <span className="mt-1 text-[0.5625rem] font-semibold tracking-[0.2em] text-flame-400 uppercase">
            Content studio
          </span>
        </span>
      </div>

      <nav
        aria-label="Admin"
        className="scrollbar-on-dark flex-1 overflow-y-auto overscroll-contain px-3 py-5"
      >
        {NAV.map((group) => {
          const items = group.items.filter((item) => item.guard(viewer));
          if (!items.length) return null;

          return (
            <div key={group.title} className="mb-6 last:mb-0">
              <h2 className="px-3 pb-1.5 text-[0.625rem] font-semibold tracking-[0.16em] text-navy-300/80 uppercase">
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
                          "group relative flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150",
                          active
                            ? "bg-white/[0.07] font-semibold text-white"
                            : "font-medium text-navy-200 hover:bg-white/[0.04] hover:text-white"
                        )}
                      >
                        {/* Saffron marks where you are, but as a rule and an
                            icon rather than a filled block — a solid accent
                            block is what the one committing button on a screen
                            gets, and two of those compete. */}
                        {active ? (
                          <span className="absolute inset-y-0 left-0 w-[2px] bg-flame-400" aria-hidden />
                        ) : null}
                        <item.Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active ? "text-flame-400" : "text-navy-300 group-hover:text-navy-100"
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="group flex items-center gap-3 px-3 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowUpRight
            className="size-4 shrink-0 text-navy-300 transition-colors group-hover:text-flame-400"
            aria-hidden
          />
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

            {/* Slide-over on small screens. `inert` while closed, so the whole
                rail is out of the tab order rather than merely invisible —
                otherwise tabbing from the header walks into a hidden menu. */}
            <div
              className={cn("fixed inset-0 z-50 lg:hidden", menuOpen ? "" : "pointer-events-none")}
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
              <div
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "absolute inset-0 bg-navy-950/55 transition-opacity duration-300",
                  menuOpen ? "opacity-100" : "opacity-0"
                )}
              />
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl transition-transform duration-300 ease-out",
                  menuOpen ? "translate-x-0" : "-translate-x-full"
                )}
              >
                <Sidebar viewer={viewer} onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>

            <div className="lg:pl-64">
              {/* The bar spans the column so its rule meets the rail, but its
                  contents ride the same 6xl measure as the page below — the
                  avatar and the right edge of a panel land on one line. */}
              <header className="sticky top-0 z-30 border-b border-line bg-surface px-4 md:px-8">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                    // Pulled left by half its padding so the glyph, not the hit
                    // area, sits on the content edge.
                    className="-ml-2 grid size-10 shrink-0 place-items-center text-ink transition-colors hover:text-flame-700 lg:hidden"
                  >
                    <Menu className="size-5" />
                  </button>

                  <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
                    {/* The rail's "View the site" is at the bottom of a
                        scrolling column, and on small screens it is behind the
                        menu entirely — the way out of the CMS should be on the
                        bar at all times. */}
                    <Link
                      href="/"
                      title="Go to the public site"
                      aria-label="Go to the public site"
                      className="grid size-9 shrink-0 place-items-center text-ink-muted transition-colors hover:text-ink"
                    >
                      <Home className="size-4" />
                    </Link>

                    <ThemeToggle />

                    <span className="hidden h-6 w-px shrink-0 bg-line sm:block" aria-hidden />

                    <div className="hidden min-w-0 text-right sm:block">
                      <p className="truncate text-[0.8125rem] leading-tight font-medium text-ink">
                        {user?.name}
                      </p>
                      <p className="truncate text-[0.6875rem] leading-tight text-ink-muted">
                        {user?.email}
                      </p>
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[2px] bg-navy-800 text-[0.8125rem] font-semibold text-white select-none dark:bg-navy-700">
                      {user?.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      aria-label="Sign out"
                      className="grid size-9 shrink-0 place-items-center text-ink-muted transition-colors hover:text-ink"
                    >
                      <LogOut className="size-4" />
                    </button>
                  </div>
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
      <div className="border-y border-line-strong px-6 py-20 text-center">
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
