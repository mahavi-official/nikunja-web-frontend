import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/format";

/* ── button / link ─────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-flame-500 text-white hover:bg-flame-600 active:bg-flame-700 shadow-[0_6px_18px_-8px] shadow-flame-700/70",
  secondary:
    "bg-transparent text-ink border border-line-strong hover:border-navy-400 hover:bg-surface-raised",
  ghost: "bg-transparent text-ink-soft hover:text-ink hover:bg-surface-sunken",
  inverse: "bg-white text-navy-900 hover:bg-sand-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.9375rem] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 whitespace-nowrap disabled:opacity-55 disabled:pointer-events-none";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/* ── badges & pills ────────────────────────────────────────── */

export function Badge({
  children,
  tone = "navy",
  className,
}: {
  children: React.ReactNode;
  tone?: "navy" | "flame" | "muted";
  className?: string;
}) {
  const tones = {
    navy: "bg-navy-50 text-navy-700 dark:bg-navy-800/60 dark:text-navy-100",
    flame: "bg-flame-50 text-flame-700 dark:bg-flame-900/40 dark:text-flame-200",
    muted: "bg-surface-sunken text-ink-muted",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── section heading ───────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center"
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 className="mt-2 text-2xl md:text-3xl">{title}</h2>
        {description ? <p className="mt-3 text-ink-soft">{description}</p> : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-600 transition-colors hover:text-flame-600 dark:text-navy-200"
        >
          {linkLabel}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

/* ── breadcrumbs ───────────────────────────────────────────── */

export function Breadcrumbs({ trail }: { trail: { name: string; url: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-ink-muted">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={item.url} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="font-medium text-ink-soft">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.url} className="transition-colors hover:text-flame-600">
                    {item.name}
                  </Link>
                  <ChevronRight className="size-3.5 opacity-50" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── JSON-LD ───────────────────────────────────────────────── */

/**
 * Structured data comes from the backend already built. We only serialise it.
 * `<` escaping keeps a stray `</script>` inside content from closing the tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const documents = Array.isArray(data) ? data : [data];
  if (!documents.length) return null;

  return (
    <>
      {documents.map((doc, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(doc).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

/* ── empty state ───────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface-raised/60 px-6 py-16 text-center">
      <h3 className="text-lg text-ink">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{description}</p> : null}
      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="sm" className="mt-6">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/* ── pagination ────────────────────────────────────────────── */

/**
 * Server-rendered links, not buttons — every page of a listing is a real,
 * crawlable URL that self-canonicalises.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const window: (number | "gap")[] = [];
  for (let index = 1; index <= totalPages; index += 1) {
    if (index === 1 || index === totalPages || Math.abs(index - page) <= 1) {
      window.push(index);
    } else if (window[window.length - 1] !== "gap") {
      window.push("gap");
    }
  }

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={buttonClass("secondary", "sm")}>
          Previous
        </Link>
      ) : null}

      {window.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1.5 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
              item === page
                ? "bg-navy-800 text-white dark:bg-navy-600"
                : "text-ink-soft hover:bg-surface-sunken hover:text-ink"
            )}
          >
            {item}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={buttonClass("secondary", "sm")}>
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export { absoluteUrl };
