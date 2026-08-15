"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/format";

/**
 * The light/dark switch.
 *
 * One control, two states, no menu: a site with exactly two grounds does not
 * need a three-way "system" option in the header — following the system is
 * already what happens until this button is pressed.
 *
 * The two icons are stacked and cross-faded rather than swapped, so the switch
 * reads as one thing turning over instead of two things replacing each other.
 */
export function ThemeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  /** `full` is the labelled row used inside the mobile sheet. */
  variant?: "icon" | "full";
}) {
  const { theme, ready, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const label = dark ? "Switch to light background" : "Switch to dark background";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={dark}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-ink-soft transition-colors hover:bg-surface-sunken",
          className
        )}
      >
        <span className="flex items-center gap-3">
          <Icons dark={dark} ready={ready} />
          {ready ? (dark ? "Dark background" : "Light background") : "Background"}
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
            dark ? "bg-flame-500" : "bg-line-strong"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-300",
              dark && "translate-x-5"
            )}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink",
        className
      )}
    >
      <Icons dark={dark} ready={ready} />
    </button>
  );
}

/**
 * Both icons always render, one of them at zero opacity. Rendering only the
 * active one would mean the server picks an icon it cannot know is right, and
 * hydration would tear; this way the markup is identical either way and only
 * opacity — never the DOM — changes when the real theme is known.
 */
function Icons({ dark, ready }: { dark: boolean; ready: boolean }) {
  return (
    <span className={cn("relative grid size-5 place-items-center", !ready && "opacity-0")}>
      <Sun
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 size-5 transition-all duration-300",
          dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 size-5 transition-all duration-300",
          dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
        )}
      />
    </span>
  );
}
