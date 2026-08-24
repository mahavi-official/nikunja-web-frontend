/** @type {import('next').NextConfig} */

const API_ORIGIN = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

// Media lives in the "media" container of the Azure Blob Storage account, e.g.
// https://radhakundah.blob.core.windows.net/media/<key>.jpg — the API hands us
// absolute URLs on that host, so it must always be renderable.
const BLOB_ORIGIN = "https://radhakundah.blob.core.windows.net";

/**
 * Every remote host we are allowed to render images from. The blob account and
 * whatever CDN sits in front of it, plus YouTube's thumbnail hosts (videos are
 * YouTube-only).
 */
const remotePatterns = [
  { protocol: "https", hostname: "i.ytimg.com" },
  { protocol: "https", hostname: "img.youtube.com" },
  { protocol: "https", hostname: "picsum.photos" },
];

const mediaOrigins = new Set([BLOB_ORIGIN]);
if (process.env.NEXT_PUBLIC_CDN_URL) mediaOrigins.add(process.env.NEXT_PUBLIC_CDN_URL);

for (const origin of mediaOrigins) {
  const { protocol, hostname } = new URL(origin);
  if (remotePatterns.some((pattern) => pattern.hostname === hostname)) continue;
  // Scope the blob account to its "media" container rather than the whole
  // storage account; a CDN in front of it gets the same courtesy if it
  // fronts a path rather than the bare origin.
  const pathname = hostname === new URL(BLOB_ORIGIN).hostname ? "/media/**" : "/**";
  remotePatterns.push({ protocol: protocol.replace(":", ""), hostname, pathname });
}

// Local development serves media straight off the API.
if (API_ORIGIN.startsWith("http://localhost")) {
  remotePatterns.push({ protocol: "http", hostname: "localhost" });
}

const nextConfig = {
  reactStrictMode: true,

  // Fixed to "off" and enforced by middleware — one URL shape, no duplicates.
  trailingSlash: false,

  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    // The backend is the single source of SEO truth: it generates the sitemaps,
    // we proxy them so they are served from the canonical domain.
    return [
      { source: "/sitemap.xml", destination: `${API_ORIGIN}/sitemap.xml` },
      { source: "/sitemaps/:file", destination: `${API_ORIGIN}/sitemaps/:file` },
    ];
  },

  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];

    // Anything that is not the production site must never be indexed.
    if (process.env.NEXT_PUBLIC_ENABLE_INDEXING !== "true") {
      headers.push({
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      });
    }

    return headers;
  },
};

export default nextConfig;
