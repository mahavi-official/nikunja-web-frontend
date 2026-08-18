"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  THEME_STORAGE_KEY,
  THEME_TRANSITION_ATTR,
  THEME_TRANSITION_MS,
  type Theme,
} from "@/lib/theme";

/**
 * Owns the light/dark choice for the whole document.
 *
 * The attribute on `<html>` is the source of truth — the inline script in the
 * root layout has already set it before React runs — so this provider reads it
 * rather than deciding it, and only writes when the reader asks for a change.
 *
 * Until an explicit choice is stored the site follows the operating system and
 * keeps following it, so a reader whose Mac flips at sunset sees the site flip
 * with everything else. The moment they touch the toggle, their choice wins and
 * the system stops being consulted.
 */

interface ThemeState {
  theme: Theme;
  /** False during SSR and the first paint, when the real theme is not yet known. */
  ready: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

/** Matches `--surface` for each ground; keeps the browser chrome in step. */
const CHROME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#080f24" };

function readDocumentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function paintBrowserChrome(theme: Theme) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", CHROME_COLOR[theme]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Light on the server and on the first client render, matching the markup the
  // server sent; the effect below reconciles with the attribute immediately.
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readDocumentTheme();
    setThemeState(initial);
    setReady(true);
    paintBrowserChrome(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      // An explicit choice outranks the system for good.
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        return;
      }
      const next: Theme = event.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      paintBrowserChrome(next);
      setThemeState(next);
    };

    media.addEventListener("change", onSystemChange);

    // Another tab toggled: follow it, so two open windows never disagree.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next: Theme = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      paintBrowserChrome(next);
      setThemeState(next);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;

    // Colours transition only across a switch. Left on permanently, the
    // transition would fight every hover state on the page.
    root.setAttribute(THEME_TRANSITION_ATTR, "");
    window.setTimeout(() => root.removeAttribute(THEME_TRANSITION_ATTR), THEME_TRANSITION_MS);

    root.setAttribute("data-theme", next);
    paintBrowserChrome(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing with storage denied — the choice simply lasts this page.
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      ready,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, ready, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
