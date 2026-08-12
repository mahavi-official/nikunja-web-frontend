import { notFound, permanentRedirect, redirect } from "next/navigation";
import { lookupRedirect } from "./api";

/**
 * What to do when a slug does not resolve.
 *
 * The CMS writes a `UrlRedirect` row whenever a published item's slug changes,
 * and a permanent one for `/blogs/{slug}` → `/articles/{slug}` on BOTH-placement
 * posts. Rather than paying for that lookup in middleware on every request, we
 * pay for it only here — at the moment a page would otherwise 404.
 *
 * Result: the happy path costs nothing, a moved URL still emits a real 301, and
 * a genuinely missing page returns a real 404 instead of a soft 200.
 */
export async function redirectOrNotFound(path: string): Promise<never> {
  const rule = await lookupRedirect(path);

  if (rule?.toPath) {
    if (rule.statusCode === 302 || rule.statusCode === 307) redirect(rule.toPath);
    permanentRedirect(rule.toPath);
  }

  notFound();
}
