import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/api";

/**
 * On-demand cache invalidation, called by the backend the moment an admin
 * write lands in Postgres.
 *
 * Every read in `lib/api.ts` is cached with a long `revalidate` window and a
 * tag. Without this route an edit stays invisible until that window expires,
 * which is why a stale About page used to need `.next` deleted by hand. The
 * TTLs are the safety net; this is the mechanism that actually keeps the site
 * fresh.
 *
 * Dropping the tag is only half the job — the next visitor would still pay for
 * the refetch. When the caller also sends `paths` we request those pages
 * ourselves so the cache is warm again before anyone asks for it. The warm-up
 * is best-effort on purpose: if it fails the tag is still gone, and the next
 * visitor repopulates the cache the ordinary way.
 */

// `revalidateTag` needs the Node runtime, and this route must never be
// prerendered or cached itself.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Caps how much work one call can ask for, so a leaked secret stays boring. */
const MAX_TARGETS = 32;

/**
 * Must stay comfortably below the caller's own timeout (see
 * `revalidateFrontend` in the backend), or the backend gives up and logs a
 * failure for a revalidation that actually succeeded.
 */
const WARM_TIMEOUT_MS = 5_000;

interface RevalidateBody {
  tags?: unknown;
  paths?: unknown;
}

/** Constant-time compare, so the secret cannot be guessed a byte at a time. */
function matchesSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed) seen.add(trimmed);
    if (seen.size >= MAX_TARGETS) break;
  }

  return [...seen];
}

/**
 * Resolves a caller-supplied path against our own origin and rejects anything
 * that lands elsewhere. Parsing rather than string-matching is deliberate:
 * `//evil.com` and `/\evil.com` both read as same-site but resolve off-origin.
 */
function resolveSameOrigin(path: string): string | null {
  try {
    const url = new URL(path, SITE_URL);
    return url.origin === new URL(SITE_URL).origin ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Re-requests each page so the cache we just dropped is populated again. */
async function warm(paths: string[]): Promise<string[]> {
  const warmed: string[] = [];

  await Promise.all(
    paths.map(async (path) => {
      const url = resolveSameOrigin(path);
      if (!url) {
        console.warn(`[revalidate] refusing to warm off-origin path: ${path}`);
        return;
      }

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
        });
        // Drain the body so the socket is released rather than held until GC.
        await response.arrayBuffer();

        if (response.ok) {
          warmed.push(path);
        } else {
          console.warn(`[revalidate] warming ${path} returned HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn(
          `[revalidate] warming ${path} failed; the next visitor will repopulate it:`,
          error
        );
      }
    })
  );

  return warmed;
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    console.error("[revalidate] REVALIDATE_SECRET is not set; refusing the request");
    return NextResponse.json({ error: "Revalidation is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-revalidate-secret");
  if (!provided || !matchesSecret(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const tags = uniqueStrings(body.tags);
  const paths = uniqueStrings(body.paths);

  if (!tags.length && !paths.length) {
    return NextResponse.json({ error: "Nothing to revalidate" }, { status: 400 });
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  // Only worth warming once the tags are gone — warming first would just
  // re-cache the copy we are about to invalidate.
  const warmed = await warm(paths);

  return NextResponse.json({ revalidated: tags, warmed });
}
