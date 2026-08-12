import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * A real 404 — Next serves this with the correct status. Pages reach it only
 * after the redirect table has been checked, so a moved URL will have 301'd
 * before ever landing here.
 */
export default function NotFound() {
  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-20 text-center">
      <div className="max-w-lg">
        <p className="font-serif text-7xl font-semibold text-flame-500">404</p>
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
    </div>
  );
}
