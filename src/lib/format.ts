import type { Media } from "./types";

/**
 * Dates are stored UTC and returned ISO 8601. Server-rendered output must use a
 * fixed, timezone-independent format or hydration mismatches. Anything that
 * should follow the reader's own clock is a client component
 * (`components/LocalDate.tsx`).
 */
const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ABSOLUTE_SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : ABSOLUTE.format(date);
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : ABSOLUTE_SHORT.format(date);
}

/** `2026-08-12` — for the `dateTime` attribute on `<time>`. */
export function isoDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** ISO 8601 duration for VideoObject structured data. */
export function isoDuration(seconds: number | null | undefined): string | undefined {
  if (!seconds || seconds < 0) return undefined;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${secs}S`;
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/** Rough read time from an HTML body, at 220 words per minute. */
export function readingTime(html: string | undefined | null): number {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function stripHtml(html: string | null | undefined): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(text: string, length = 160): string {
  const clean = text.trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", length) || length)}…`;
}

/**
 * Picks a pre-generated derivative rather than the original. Sizes are made at
 * upload time by sharp, so the browser never downloads a 4MB JPEG for a card.
 */
export function mediaUrl(
  media: Media | null | undefined,
  size: "thumb" | "medium" | "large" | "og" = "medium"
): string | null {
  if (!media) return null;
  const variant = media.variants?.[size];
  return variant?.webp || variant?.original || media.url || null;
}

export function mediaAlt(media: Media | null | undefined, fallback: string): string {
  return media?.alt?.trim() || fallback;
}

export function youtubeThumb(youtubeId: string, quality: "hq" | "maxres" = "hq"): string {
  return `https://i.ytimg.com/vi/${youtubeId}/${quality === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`;
}

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
