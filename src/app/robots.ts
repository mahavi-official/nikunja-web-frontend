import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api";

/**
 * Production allows crawling everything public and points at the backend-built
 * sitemap index (proxied through `next.config.mjs` rewrites so it is served
 * from the canonical domain).
 *
 * Every other environment disallows everything. `next.config.mjs` also sends
 * `X-Robots-Tag: noindex` there — belt and braces, because a staging deploy
 * getting indexed is expensive to undo.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ENABLE_INDEXING !== "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/preview", "/account", "/search", "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
