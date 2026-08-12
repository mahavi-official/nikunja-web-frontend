"use client";

import { useState } from "react";
import { Check, Facebook, Link2, Linkedin, Share2, Twitter } from "lucide-react";

/**
 * Native share where the platform offers it, explicit network links elsewhere.
 * No third-party share widgets — they cost a round trip and track the reader.
 */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: Twitter,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: Linkedin,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the links still work */
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
        Share
      </span>

      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-flame-400 hover:bg-flame-50 hover:text-flame-600 dark:hover:bg-flame-900/30"
        >
          <Icon className="size-4" aria-hidden />
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy link"}
        className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-flame-400 hover:text-flame-600"
      >
        {copied ? <Check className="size-4 text-flame-600" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      </button>

      <button
        type="button"
        onClick={nativeShare}
        aria-label="Share"
        className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-flame-400 hover:text-flame-600 sm:hidden"
      >
        <Share2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
