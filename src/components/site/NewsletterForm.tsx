"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { subscribeNewsletter } from "@/lib/api";
import { cn } from "@/lib/format";

/**
 * Single opt-in. The backend rate-limits this to 3/hour per IP and stores an
 * unsubscribe token; there is no campaign sending behind it.
 */
export function NewsletterForm({ tone = "inverse" }: { tone?: "inverse" | "default" }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;

    setState("sending");
    try {
      await subscribeNewsletter(email);
      setState("done");
      setMessage("You're on the list. Thank you.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "That didn't go through. Please try again."
      );
    }
  };

  const inverse = tone === "inverse";

  if (state === "done") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          inverse ? "text-flame-300" : "text-flame-600"
        )}
        role="status"
      >
        <Check className="size-4" aria-hidden />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row",
          inverse ? "text-white" : "text-ink"
        )}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={cn(
            "h-11 flex-1 rounded-full border px-5 text-[0.9375rem] outline-none transition-colors",
            inverse
              ? "border-white/20 bg-white/8 text-white placeholder:text-sand-300/70 focus:border-flame-400"
              : "border-line-strong bg-surface-raised placeholder:text-ink-muted focus:border-flame-400"
          )}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-flame-500 px-6 text-[0.9375rem] font-medium whitespace-nowrap text-white transition-colors hover:bg-flame-600 disabled:opacity-60"
        >
          {state === "sending" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          Subscribe
        </button>
      </div>

      {state === "error" ? (
        <p className="mt-2 text-sm text-flame-300" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
