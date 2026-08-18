"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/primitives";

/**
 * Shown when a render throws — most often because the API is unreachable.
 * The message stays generic; the detail goes to the console and, in
 * production, to whatever collector is wired to it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-20 text-center">
      <div className="max-w-lg">
        <AlertTriangle className="mx-auto size-9 text-flame-500" aria-hidden />
        <h1 className="mt-5 text-3xl">Something went wrong</h1>
        <p className="mt-4 text-ink-soft">
          This page could not be loaded. It is usually temporary — try again in a moment.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-muted">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Back home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
