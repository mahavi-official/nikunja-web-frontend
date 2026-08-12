"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitContact } from "@/lib/api";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

const FIELD =
  "h-11 w-full rounded-xl border border-line-strong bg-surface-raised px-4 text-[0.9375rem] outline-none transition-colors focus:border-flame-400 placeholder:text-ink-muted";

/**
 * Messages are stored in the CMS and emailed to the notify address.
 *
 * Spam handling is the backend's: a honeypot field, 3 submissions per hour per
 * IP, and a reCAPTCHA escalation once that limit is hit. The honeypot below is
 * visually hidden but must stay in the DOM and stay empty.
 */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setState("sending");
    setFieldErrors({});

    try {
      const result = await submitContact({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        subject: String(form.get("subject") ?? "") || undefined,
        message: String(form.get("message") ?? ""),
        website: String(form.get("website") ?? ""),
      });
      setState("done");
      setMessage(result.message || "Thank you — your message has reached us.");
    } catch (error) {
      setState("error");
      const details = (error as { details?: { field: string; message: string }[] })?.details;
      if (details?.length) {
        setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])));
      }
      setMessage(
        error instanceof Error ? error.message : "That didn't send. Please try again shortly."
      );
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-[var(--radius-card)] border border-flame-200 bg-flame-50 p-8 text-center dark:border-flame-900 dark:bg-flame-900/20">
        <CheckCircle2 className="mx-auto size-8 text-flame-600 dark:text-flame-400" aria-hidden />
        <h2 className="mt-4 text-xl">Message sent</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" error={fieldErrors.name} required>
          <input id="name" name="name" required autoComplete="name" className={FIELD} />
        </Field>

        <Field label="Email" name="email" error={fieldErrors.email} required>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={FIELD}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" error={fieldErrors.phone} optional>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={FIELD} />
        </Field>

        <Field label="Subject" name="subject" error={fieldErrors.subject} optional>
          <input id="subject" name="subject" className={FIELD} />
        </Field>
      </div>

      <Field label="Message" name="message" error={fieldErrors.message} required>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className={cn(FIELD, "h-auto resize-y py-3 leading-relaxed")}
        />
      </Field>

      {state === "error" ? (
        <p role="alert" className="text-sm text-flame-700 dark:text-flame-300">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-ink-muted">
          We reply from a monitored address. Your details are never sold or shared.
        </p>
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          Send message
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  required,
  optional,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-flame-600">*</span> : null}
        {optional ? <span className="ml-1.5 text-xs font-normal text-ink-muted">optional</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-flame-700 dark:text-flame-300">{error}</p>
      ) : null}
    </div>
  );
}
