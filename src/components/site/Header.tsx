"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, Search, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/research", label: "Research" },
  { href: "/articles", label: "Articles" },
  { href: "/blogs", label: "Blogs" },
  { href: "/gallery", label: "Gallery" },
  { href: "/videos", label: "Videos" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const { user, loading, signIn, signOut } = useAuth();

  // Close everything on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The mobile sheet takes over the viewport; stop the page behind it scrolling.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query === "string" && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-full focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-line bg-surface/85 backdrop-blur-xl"
            : "border-transparent bg-surface"
        )}
      >
        <div className="container-page flex h-18 items-center justify-between gap-4">
          <Link href="/" aria-label="Radhakundah — home" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-[0.9375rem] font-medium transition-colors",
                      isActive(item.href)
                        ? "text-flame-600"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    {item.label}
                    {isActive(item.href) ? (
                      <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-flame-500" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-expanded={searchOpen}
              aria-label="Search the site"
              className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
            </button>

            {loading ? (
              <span className="hidden h-9 w-24 animate-pulse rounded-full bg-surface-sunken sm:block" />
            ) : user ? (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Link
                  href="/account"
                  className="flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-100">
                    <User className="size-3.5" aria-hidden />
                  </span>
                  {user.name.split(" ")[0]}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  aria-label="Sign out"
                  className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn()}
                className={buttonClass("secondary", "sm", "hidden sm:inline-flex")}
              >
                <LogIn className="size-4" aria-hidden />
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-surface-sunken lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="border-t border-line bg-surface-raised">
            <form onSubmit={onSearch} role="search" className="container-page flex items-center gap-3 py-4">
              <Search className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <input
                ref={searchInput}
                type="search"
                name="q"
                placeholder="Search research, articles, and videos…"
                aria-label="Search query"
                className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted"
              />
              <button type="submit" className={buttonClass("primary", "sm")}>
                Search
              </button>
            </form>
          </div>
        ) : null}
      </header>

      {/* Mobile sheet */}
      <div
        className={cn(
          "fixed inset-0 z-60 lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-navy-950/50 backdrop-blur-sm transition-opacity duration-300",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
        />
        <nav
          aria-label="Mobile"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-18 items-center justify-between border-b border-line px-5">
            <span className="font-serif text-lg font-semibold">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-surface-sunken"
            >
              <X className="size-5" />
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto p-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-flame-50 text-flame-700 dark:bg-flame-900/30 dark:text-flame-200"
                      : "text-ink-soft hover:bg-surface-sunken"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-line p-4">
            {user ? (
              <div className="space-y-2">
                <Link href="/account" className={buttonClass("secondary", "md", "w-full")}>
                  <User className="size-4" aria-hidden />
                  {user.name}
                </Link>
                <button type="button" onClick={() => signOut()} className={buttonClass("ghost", "md", "w-full")}>
                  Sign out
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => signIn()} className={buttonClass("primary", "md", "w-full")}>
                <LogIn className="size-4" aria-hidden />
                Sign in with Google
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
