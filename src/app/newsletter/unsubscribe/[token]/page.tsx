import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { API_V1 } from "@/lib/api";
import { ButtonLink } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

// The token is single-use state, never cached.
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function UnsubscribePage({ params }: { params: Params }) {
  const { token } = await params;

  let ok = false;
  try {
    const response = await fetch(
      `${API_V1}/public/newsletter/unsubscribe/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    ok = response.ok;
  } catch {
    ok = false;
  }

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div className="max-w-md">
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto size-9 text-flame-600" aria-hidden />
            <h1 className="mt-5 text-2xl">You have been unsubscribed</h1>
            <p className="mt-3 text-ink-soft">
              Your address has been removed from the list. Nothing further will be sent, and you can
              re-subscribe at any time from the footer.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-9 text-ink-muted" aria-hidden />
            <h1 className="mt-5 text-2xl">That link is no longer valid</h1>
            <p className="mt-3 text-ink-soft">
              The token has already been used or has expired. If you are still receiving letters,
              write to us and we will remove you by hand.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back home</ButtonLink>
          {!ok ? (
            <ButtonLink href="/contact" variant="secondary">
              Contact us
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
