"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Lock, X } from "lucide-react";
import { authedFetch, useAuth } from "@/components/providers/AuthProvider";
import { buttonClass } from "@/components/ui/primitives";
import { formatBytes } from "@/lib/format";
import type { ResearchFile } from "@/lib/types";

/**
 * Gated access to a paper.
 *
 * The PDF lives in a private bucket with public access blocked at the policy
 * level. Signing in exchanges a 60-second presigned URL, which is rendered
 * inline with the viewer toolbar suppressed and context menu disabled, and the
 * access is logged server-side against the reader.
 *
 * This deters casual downloading. It is not — and was never claimed to be — a
 * technical guarantee: anything a browser renders can be captured.
 */
export function PaperAccess({
  slug,
  files,
  title,
}: {
  slug: string;
  files: ResearchFile[];
  title: string;
}) {
  const { user, loading, signIn, getToken } = useAuth();
  const [openFile, setOpenFile] = useState<{ file: ResearchFile; url: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (file: ResearchFile) => {
      if (!user) return signIn();

      setPending(file.id);
      setError(null);
      try {
        const response = await authedFetch(
          getToken,
          `/me/research/${encodeURIComponent(slug)}/view-url?fileId=${file.id}`
        );
        const payload = await response.json();
        if (!response.ok || !payload?.data?.url) {
          throw new Error(payload?.error?.message ?? "Could not open that file.");
        }
        setOpenFile({ file, url: payload.data.url as string });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not open that file.");
      } finally {
        setPending(null);
      }
    },
    [getToken, signIn, slug, user]
  );

  useEffect(() => {
    if (!openFile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFile(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openFile]);

  if (!files.length) return null;

  return (
    <section aria-labelledby="papers" className="mt-10">
      <h2 id="papers" className="text-lg">
        Papers
      </h2>

      {!user && !loading ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
          <Lock className="size-3.5" aria-hidden />
          Sign in to read the full text. Abstracts and metadata are open to everyone.
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface-raised p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-flame-50 text-flame-600 dark:bg-flame-900/30 dark:text-flame-300">
              <FileText className="size-5" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium">{file.label}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {formatBytes(file.sizeBytes)}
                {file.pageCount ? ` · ${file.pageCount} pages` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => open(file)}
              disabled={pending === file.id}
              className={buttonClass(user ? "primary" : "secondary", "sm")}
            >
              {pending === file.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : user ? null : (
                <Lock className="size-3.5" aria-hidden />
              )}
              {user ? "Read paper" : "Sign in to read"}
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-flame-700 dark:text-flame-300">
          {error}
        </p>
      ) : null}

      {openFile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${openFile.file.label} — ${title}`}
          className="fixed inset-0 z-90 flex flex-col bg-navy-950/95 backdrop-blur-sm"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{openFile.file.label}</p>
              <p className="truncate text-xs text-sand-300/70">{title}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenFile(null)}
              aria-label="Close reader"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-flame-400"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-navy-900 px-2 pb-2">
            <iframe
              // `#toolbar=0` removes the built-in download and print controls.
              src={`${openFile.url}#toolbar=0&navpanes=0&view=FitH`}
              title={`${openFile.file.label} — ${title}`}
              className="h-full w-full rounded-lg bg-white"
            />
          </div>

          <p className="px-5 py-2 text-center text-[0.6875rem] text-sand-300/60">
            This link expires in 60 seconds and your access has been recorded. Please do not
            redistribute.
          </p>
        </div>
      ) : null}
    </section>
  );
}
