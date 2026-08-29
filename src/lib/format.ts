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

/** The one origin public media is served from. Mirrors next.config.mjs. */
export const MEDIA_ORIGIN = (
  process.env.NEXT_PUBLIC_CDN_URL || "https://radhakundah.blob.core.windows.net"
).replace(/\/+$/, "");

/** The public container inside the storage account. Every key lives under it. */
export const MEDIA_CONTAINER = "media";

const isBlobHost = (host: string) => /\.blob\.core\.windows\.net$/i.test(host);

/**
 * True when a stored value is a *reference* to an image — a URL or a storage
 * key — rather than the image itself.
 *
 * The API fills `variants` with base64-encoded bytes from sharp instead of
 * uploading the derivatives and storing their URLs, so a variant slot usually
 * holds a whole WebP file. Putting that in an `src` yields a request for
 * `…/media/UklGRkIqAABXRUJQ…`, which is what broke the gallery. Keys are short
 * and end in an image extension; encoded bytes are neither.
 */
function isMediaRef(value: string | null | undefined): value is string {
  const raw = value?.trim();
  if (!raw) return false;
  // A proper data URI is self-describing and renders as-is, unlike the bare
  // base64 in `variants`.
  if (/^data:image\//i.test(raw)) return true;
  // Longer than any real key or signed URL, so it can only be a payload.
  if (raw.length > 1024) return false;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return true;
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(raw.split(/[?#]/)[0]);
}

// Straight at blob storage the container is part of the path. A CDN in front
// of it is already pointed at that container, so its origin is the whole base.
const MEDIA_BASE = isBlobHost(new URL(MEDIA_ORIGIN).hostname)
  ? `${MEDIA_ORIGIN}/${MEDIA_CONTAINER}`
  : MEDIA_ORIGIN;

/**
 * Pins a stored URL to `<origin>/media/<key>`.
 *
 * Records written by older uploaders carry the wrong shape — a stale storage
 * account, or the container segment missing entirely
 * (`https://…blob.core.windows.net/<key>.jpg`), which 404s. Rather than trust
 * whatever the API hands us, we keep the key and rebuild the rest. Anything
 * that is not blob storage (YouTube thumbnails, the API's own dev uploads,
 * data URIs) is left untouched.
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  // Never let image bytes masquerade as a key and get a base URL glued on.
  if (!isMediaRef(raw)) return null;

  // Already carries its own bytes.
  if (/^data:/i.test(raw)) return raw;

  // Root-relative paths are served by the site or the API in dev — not ours.
  if (raw.startsWith("/")) return raw;

  // Bare storage key straight out of the database.
  if (!/^https?:\/\//i.test(raw)) return `${MEDIA_BASE}/${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  if (!isBlobHost(parsed.hostname)) return raw;

  // Drop the container if it is already there, so we never double it up.
  const key = parsed.pathname
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${MEDIA_CONTAINER}/`, "i"), "");
  if (!key) return raw;

  return `${MEDIA_BASE}/${key}${parsed.search}`;
}

/**
 * Prefers a pre-generated derivative over the original, so the browser never
 * downloads a 4MB JPEG for a card.
 *
 * A variant counts only when it actually points at one. Today the API stores
 * sharp's output as base64 in `variants` rather than uploading it, so every
 * slot fails that test and we fall back to the uploaded original — correct,
 * just heavier than it should be. Once the API stores derivative URLs this
 * starts preferring them with no change here.
 */
export function mediaUrl(
  media: Media | null | undefined,
  size: "thumb" | "medium" | "large" | "og" = "medium"
): string | null {
  if (!media) return null;
  const variant = media.variants?.[size];
  const ref = [variant?.webp, variant?.original].find(isMediaRef);
  return normalizeMediaUrl(ref ?? media.url);
}

/**
 * Runs every `<img src>` in stored HTML through the same pinning.
 *
 * Post bodies are written by the admin editor, so they keep whatever URL shape
 * was current when they were saved — a stale storage account, a missing
 * container, or base64 the editor baked straight into the markup. An image we
 * cannot resolve is dropped, since a broken box is worse than a gap.
 */
export function normalizeMediaHtml(html: string | null | undefined): string {
  if (!html) return "";

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const attr = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const value = attr?.[1] ?? attr?.[2];
    if (!attr || !value) return tag;

    const url = normalizeMediaUrl(decodeHtml(value));
    if (!url) return "";
    return tag.replace(attr[0], ` src="${url.replace(/"/g, "&quot;")}"`);
  });
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Splits plain text into paragraphs on blank lines, rejoining the single
 * newlines inside each one into spaces.
 *
 * Abstracts and descriptions get pasted out of PDFs and Word, which carry a
 * hard newline at the end of every typeset line. Rendering that with
 * `white-space: pre-line` faithfully reproduces the *source document's* line
 * wrapping, so sentences break mid-clause at whatever width the PDF happened
 * to use — while the admin textarea soft-wraps and looks perfectly fine, which
 * is why the two never agreed. Only a blank line is treated as a real
 * paragraph break, because only a blank line reliably means one.
 */
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];

  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) => block.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean);
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
