import type { Metadata } from "next";
import { SITE_URL } from "./api";
import type { Seo, Settings } from "./types";

/**
 * The backend is the single source of SEO truth. Everything here either
 * translates its resolved `seo` block into Next's `Metadata`, or builds the
 * equivalent for the handful of pages that have no backing entity
 * (listings, search, contact).
 */

export const SITE_NAME = "Radhakundah";
export const SITE_TAGLINE = "Research, articles, and living tradition from Radha Kunda";

const INDEXING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_INDEXING === "true";

/** Absolute URL for a site-relative path. Every emitted URL is absolute. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function robotsFrom(directive: string | undefined, forceNoIndex: boolean) {
  const noIndex = forceNoIndex || !INDEXING_ENABLED || directive?.includes("noindex");
  return {
    index: !noIndex,
    follow: !directive?.includes("nofollow") && !noIndex,
    googleBot: { index: !noIndex, follow: !noIndex },
  };
}

/**
 * Translates a backend `seo` object into Next metadata verbatim — no fallback
 * logic here, the API already resolved every field.
 */
export function metadataFromSeo(seo: Seo, extra?: { keywords?: string[] }): Metadata {
  const image = seo.openGraph.image;

  return {
    title: seo.title,
    description: seo.description,
    keywords: extra?.keywords?.length ? extra.keywords : undefined,
    alternates: { canonical: seo.canonical },
    robots: robotsFrom(seo.robots, false),
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      siteName: seo.openGraph.siteName || SITE_NAME,
      type: seo.openGraph.type === "video.other" ? "video.other" : seo.openGraph.type,
      images: image ? [{ url: image, width: 1200, height: 630, alt: seo.openGraph.title }] : undefined,
      ...(seo.openGraph.type === "article"
        ? {
            publishedTime: seo.openGraph.publishedTime,
            modifiedTime: seo.openGraph.modifiedTime,
            authors: seo.openGraph.author ? [seo.openGraph.author] : undefined,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.image ? [seo.twitter.image] : undefined,
    },
  };
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  /** Emits rel=prev / rel=next for paginated listings. */
  pagination?: { page: number; totalPages: number };
}

/** Metadata for pages that have no backing entity (listings, search, contact). */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
  pagination,
}: PageMetaInput): Metadata {
  const canonical = absoluteUrl(path);
  const ogImage = image ?? absoluteUrl("/og-default.png");

  const other: Record<string, string> = {};
  if (pagination) {
    const base = path.split("?")[0];
    if (pagination.page > 1) {
      const prev = pagination.page - 1;
      other["link:prev"] = absoluteUrl(prev === 1 ? base : `${base}?page=${prev}`);
    }
    if (pagination.page < pagination.totalPages) {
      other["link:next"] = absoluteUrl(`${base}?page=${pagination.page + 1}`);
    }
  }

  return {
    title,
    description,
    alternates: { canonical },
    robots: robotsFrom(undefined, noIndex),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

/** Sitewide Organization + WebSite (with SearchAction) graph. */
export function siteJsonLd(settings: Settings): Record<string, unknown>[] {
  const siteName = (settings["site.title"] as string) || SITE_NAME;
  const sameAs = [
    settings["social.facebook"],
    settings["social.twitter"],
    settings["social.instagram"],
    settings["social.linkedin"],
    settings["social.youtube"],
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: SITE_URL,
      logo: absoluteUrl("/logo.png"),
      ...(sameAs.length ? { sameAs } : {}),
      ...(settings["contact.email"]
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: settings["contact.email"],
              ...(settings["contact.phone"] ? { telephone: settings["contact.phone"] } : {}),
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** BreadcrumbList for pages the API does not build one for. */
export function breadcrumbJsonLd(trail: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/** Canonical path for a post. `BOTH` always resolves to /articles. */
export function postPath(post: { placement: string; slug: string }): string {
  return post.placement === "BLOG" ? `/blogs/${post.slug}` : `/articles/${post.slug}`;
}
