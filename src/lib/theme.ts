/**
 * The two grounds the site can stand on.
 *
 *   light → white. The dominant surface, and the default the design was drawn for.
 *   dark  → nila. The same palette after dark: deep blue, never grey.
 *
 * The choice lives in one place, `data-theme` on `<html>`, which drives both the
 * semantic tokens in `globals.css` and every Tailwind `dark:` utility. One
 * mechanism, so the two can never disagree.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "radhakundah-theme";

/** Marks the brief cross-fade after a switch, so only then does the page animate. */
export const THEME_TRANSITION_ATTR = "data-theme-changing";

export const THEME_TRANSITION_MS = 320;

/**
 * Runs before first paint, inlined in `<head>`.
 *
 * Without it the server's markup (always light) would paint for a frame before
 * React hydrated and corrected it — a white flash on every navigation for a
 * reader who chose dark. Deliberately terse: it is parsed on the critical path.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
