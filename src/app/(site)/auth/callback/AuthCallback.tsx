"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/primitives";

/**
 * The backend redirects here with `?token=…` after a successful Google sign-in,
 * having already set the httpOnly refresh cookie.
 *
 * We do not keep the token from the URL: we strip it from the address bar and
 * let `AuthProvider` mint a fresh one from the cookie. That way the only copy
 * of an access token lives in memory, and nothing sensitive survives in history.
 */
export function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error) {
      setFailed(true);
      return;
    }

    const returnTo = sessionStorage.getItem("radhakundah:returnTo") || "/";
    sessionStorage.removeItem("radhakundah:returnTo");

    // Replace so the token-bearing URL never enters the history stack.
    window.history.replaceState({}, "", "/auth/callback");
    router.replace(returnTo.startsWith("/") ? returnTo : "/");
    router.refresh();
  }, [router]);

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      {failed ? (
        <div>
          <AlertCircle className="mx-auto size-8 text-flame-600" aria-hidden />
          <h1 className="mt-4 text-2xl">Sign-in did not complete</h1>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Google did not return a usable session. If your account was suspended, contact the
            editorial team.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <ButtonLink href="/">Back home</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Contact us
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div>
          <Loader2 className="mx-auto size-7 animate-spin text-flame-500" aria-hidden />
          <p className="mt-4 text-ink-soft">Signing you in…</p>
        </div>
      )}
    </div>
  );
}
