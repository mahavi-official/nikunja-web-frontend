import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/primitives";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * A real 404 — Next serves this with the correct status. Pages reach it only
 * after the redirect table has been checked, so a moved URL will have 301'd
 * before ever landing here.
 *
 * This is the *root* not-found, so it catches addresses that never matched a
 * segment at all and therefore sit outside `(site)`. It carries the chrome
 * itself rather than inheriting it — a visitor who mistypes a URL should still
 * land somewhere they can navigate out of.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-page grid min-h-[65vh] flex-1 place-items-center py-20 text-center">
      <div className="max-w-lg">
        <p className="font-display text-8xl font-semibold text-flame-500">404</p>
        <h1 className="mt-5 text-3xl">This page is not here</h1>
        <p className="mt-4 text-ink-soft">
          The address may be mistyped, or the piece may have been withdrawn. Everything published is
          reachable from the sections below.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/research" variant="secondary">
            Research
          </ButtonLink>
          <ButtonLink href="/articles" variant="secondary">
            Articles
          </ButtonLink>
          <ButtonLink href="/search" variant="ghost">
            Search
          </ButtonLink>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
