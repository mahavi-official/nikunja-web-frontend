"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Field, Input, Switch, Textarea } from "./ui";
import { ImageField } from "./MediaPicker";
import { cn, truncate } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * The SEO block, shared by every content type that has one.
 *
 * Collapsed by default: an editor writing an article should not have to scroll
 * past six meta fields to reach Save, and the backend fills all of them from
 * the title and excerpt when they are left blank. The preview shows what those
 * fallbacks actually produce, so "leave it empty" is an informed choice rather
 * than a guess.
 */

export interface SeoValues {
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  noIndex: boolean;
  ogImage?: Media | null;
}

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 155;

function Counter({ value, limit }: { value: string; limit: number }) {
  const length = value.trim().length;
  if (!length) return null;

  return (
    <span
      className={cn(
        "text-[0.6875rem] tabular-nums",
        length > limit ? "font-medium text-flame-600" : "text-ink-muted"
      )}
    >
      {length}/{limit}
    </span>
  );
}

export function SeoPanel({
  metaTitle,
  metaDescription,
  metaKeywords,
  canonicalUrl,
  noIndex,
  ogImage,
  fallbackTitle,
  fallbackDescription,
  path,
  onChange,
  showKeywords = true,
  showCanonical = true,
  showOgImage = true,
}: SeoValues & {
  /** What the backend falls back to when the meta fields are blank. */
  fallbackTitle: string;
  fallbackDescription: string;
  /** Public path, for the preview's URL line. */
  path: string;
  onChange: (patch: Partial<SeoValues>) => void;
  showKeywords?: boolean;
  showCanonical?: boolean;
  showOgImage?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const previewTitle = metaTitle.trim() || fallbackTitle || "Untitled";
  const previewDescription =
    metaDescription.trim() ||
    truncate(fallbackDescription.replace(/<[^>]+>/g, " "), DESCRIPTION_LIMIT) ||
    "No description yet — add an excerpt or a meta description.";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-sunken/60"
      >
        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-semibold text-ink">
            Search &amp; social
          </span>
          <span className="mt-1 block text-[0.8125rem] text-ink-muted">
            {noIndex
              ? "Hidden from search engines."
              : metaTitle || metaDescription
                ? "Custom meta set."
                : "Using the title and excerpt. Open to override."}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-line p-5">
          {/* A plain-language rendering of what a result page will show. */}
          <div className="rounded-xl border border-line bg-surface-sunken/60 p-4">
            <p className="text-[0.6875rem] font-semibold tracking-wider text-ink-muted uppercase">
              Search preview
            </p>
            <p className="mt-2 truncate text-[0.75rem] text-emerald-700 dark:text-emerald-400">
              radhakundah.com{path}
            </p>
            <p className="mt-0.5 truncate text-[1.0625rem] text-navy-700 dark:text-navy-200">
              {truncate(previewTitle, TITLE_LIMIT)}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.8125rem] text-ink-soft">{previewDescription}</p>
          </div>

          <Field
            label="Meta title"
            hint="Leave blank to use the title."
            htmlFor="seo-title"
          >
            <Input
              id="seo-title"
              value={metaTitle}
              onChange={(event) => onChange({ metaTitle: event.target.value })}
              placeholder={fallbackTitle || "Page title"}
            />
            <div className="mt-1 flex justify-end">
              <Counter value={metaTitle} limit={TITLE_LIMIT} />
            </div>
          </Field>

          <Field
            label="Meta description"
            hint="Leave blank to use the excerpt."
            htmlFor="seo-description"
          >
            <Textarea
              id="seo-description"
              rows={3}
              value={metaDescription}
              onChange={(event) => onChange({ metaDescription: event.target.value })}
              placeholder={truncate(fallbackDescription, DESCRIPTION_LIMIT) || "A short summary"}
            />
            <div className="mt-1 flex justify-end">
              <Counter value={metaDescription} limit={DESCRIPTION_LIMIT} />
            </div>
          </Field>

          {showKeywords ? (
            <Field
              label="Meta keywords"
              hint="Comma separated. Search engines ignore these; kept for internal use."
              htmlFor="seo-keywords"
            >
              <Input
                id="seo-keywords"
                value={metaKeywords ?? ""}
                onChange={(event) => onChange({ metaKeywords: event.target.value })}
                placeholder="radha kunda, parikrama, kartik"
              />
            </Field>
          ) : null}

          {showCanonical ? (
            <Field
              label="Canonical URL"
              hint="Only when this republishes something that lives elsewhere."
              htmlFor="seo-canonical"
            >
              <Input
                id="seo-canonical"
                value={canonicalUrl ?? ""}
                onChange={(event) => onChange({ canonicalUrl: event.target.value })}
                placeholder="https://original-source.org/the-piece"
              />
            </Field>
          ) : null}

          {showOgImage ? (
            <ImageField
              label="Social share image"
              hint="1200×630 works best. Falls back to the cover image, then the site default."
              value={ogImage ?? null}
              onChange={(media) => onChange({ ogImage: media })}
            />
          ) : null}

          <div className="border-t border-line pt-4">
            <Switch
              checked={noIndex}
              onChange={(next) => onChange({ noIndex: next })}
              label="Hide from search engines"
              hint="Adds noindex. The page stays reachable by anyone with the link."
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
