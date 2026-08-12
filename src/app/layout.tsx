import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { JsonLd } from "@/components/ui/primitives";
import { getSettings, SITE_URL } from "@/lib/api";
import { SITE_NAME, SITE_TAGLINE, siteJsonLd } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-display",
});

const INDEXING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_INDEXING === "true";

/**
 * Sitewide defaults. Page-level `generateMetadata()` overrides title and
 * description; the template keeps the brand suffix consistent everywhere.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteTitle = (settings["site.title"] as string) || SITE_NAME;
  const description = (settings["site.description"] as string) || SITE_TAGLINE;
  const defaultOg = (settings["seo.defaultOgImage"] as string) || `${SITE_URL}/og-default.png`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteTitle} — ${SITE_TAGLINE}`,
      template: `%s · ${siteTitle}`,
    },
    description,
    applicationName: siteTitle,
    authors: [{ name: siteTitle, url: SITE_URL }],
    alternates: { canonical: "/" },
    robots: INDEXING_ENABLED
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      siteName: siteTitle,
      title: `${siteTitle} — ${SITE_TAGLINE}`,
      description,
      url: SITE_URL,
      images: [{ url: defaultOg, width: 1200, height: 630, alt: siteTitle }],
      locale: "en_AU",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteTitle} — ${SITE_TAGLINE}`,
      description,
      images: [defaultOg],
    },
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#071223" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const ga4 = settings["analytics.ga4"];

  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Media comes off the CDN — warm the connection before first paint. */}
        {process.env.NEXT_PUBLIC_CDN_URL ? (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_CDN_URL} crossOrigin="" />
        ) : null}
        <JsonLd data={siteJsonLd(settings)} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>

        {typeof ga4 === "string" && ga4 ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
