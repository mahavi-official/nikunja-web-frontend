import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { cn, formatDate, formatDateShort, isoDate } from "@/lib/format";
import type { NewsletterIssue } from "@/lib/types";

export const NEWSLETTER_NAME = "The Radhakundah Newsletter";
export const NEWSLETTER_PITCH =
  "Research, writing, and notes from the kunda, sent to your inbox as each issue is published.";

export function issuePath(issue: { slug: string }) {
  return `/newsletter/${issue.slug}`;
}

/**
 * The subscribe panel, Substack-fashion: what you get, one field, one button,
 * and the promise that leaving is one click.
 */
export function SubscribeBox({
  title = `Subscribe to ${NEWSLETTER_NAME}`,
  description = NEWSLETTER_PITCH,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-[var(--radius-card)] border border-line-strong bg-surface-raised p-6 text-center md:p-8",
        className
      )}
    >
      <h2 className="font-display text-2xl md:text-[1.75rem]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md font-serif text-ink-soft">{description}</p>
      <div className="mx-auto mt-6 max-w-md text-left">
        <NewsletterForm tone="default" buttonLabel="Subscribe" />
      </div>
      <p className="mt-3 text-xs text-ink-muted">Free. Unsubscribe from any email in one click.</p>
    </aside>
  );
}

/** One line of the archive: date in the margin, title and deck, a small picture on the right. */
export function IssueRow({ issue }: { issue: NewsletterIssue }) {
  const deck = issue.subtitle || issue.excerpt;

  return (
    <article className="group grid grid-cols-[1fr_auto] items-start gap-5 py-6 sm:grid-cols-[6.5rem_1fr_auto] sm:gap-6">
      <time
        dateTime={isoDate(issue.publishedAt)}
        className="figure-margin hidden pt-1 text-[0.6875rem] tracking-[0.08em] uppercase sm:block"
      >
        {formatDateShort(issue.publishedAt)}
      </time>

      <div className="min-w-0">
        <h3 className="font-display text-xl leading-snug md:text-[1.375rem]">
          <Link
            href={issuePath(issue)}
            className="transition-colors group-hover:text-flame-700 dark:group-hover:text-flame-300"
          >
            {issue.title}
          </Link>
        </h3>
        {deck ? <p className="mt-1.5 line-clamp-2 text-ink-soft">{deck}</p> : null}
        <p className="mt-2 text-xs text-ink-muted sm:hidden">{formatDate(issue.publishedAt)}</p>
      </div>

      {issue.coverImage ? (
        <Link
          href={issuePath(issue)}
          aria-hidden
          tabIndex={-1}
          className="relative block aspect-4/3 w-24 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken md:w-32"
        >
          <CoverImage media={issue.coverImage} alt="" size="thumb" sizes="8rem" />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </article>
  );
}

/** The latest issue, given the room a lead story gets. */
export function LatestIssue({ issue }: { issue: NewsletterIssue }) {
  return (
    <article className="group grid gap-8 border-t-2 border-ink pt-6 md:grid-cols-12 md:gap-10">
      {issue.coverImage ? (
        <Link
          href={issuePath(issue)}
          aria-hidden
          tabIndex={-1}
          className="relative block aspect-16/9 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken md:col-span-7"
        >
          <CoverImage media={issue.coverImage} alt="" size="large" priority sizes="(min-width: 768px) 58vw, 100vw" />
        </Link>
      ) : null}

      <div className={issue.coverImage ? "md:col-span-5" : "md:col-span-12 md:max-w-3xl"}>
        <span className="eyebrow">Latest issue</span>
        <h3 className="mt-2 font-display text-3xl leading-[1.15] md:text-4xl">
          <Link
            href={issuePath(issue)}
            className="transition-colors group-hover:text-flame-700 dark:group-hover:text-flame-300"
          >
            {issue.title}
          </Link>
        </h3>
        {issue.subtitle || issue.excerpt ? (
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-soft">
            {issue.subtitle || issue.excerpt}
          </p>
        ) : null}
        <p className="mt-5 text-sm text-ink-muted">
          <span className="font-medium text-ink-soft">{issue.author.name}</span>
          <span aria-hidden className="mx-2 opacity-45">
            ·
          </span>
          <time dateTime={isoDate(issue.publishedAt)}>{formatDate(issue.publishedAt)}</time>
        </p>
        <Link href={issuePath(issue)} className="link-rule mt-6 inline-block text-sm">
          Read the issue
        </Link>
      </div>
    </article>
  );
}
