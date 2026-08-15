import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/format";

/* ── button / link ─────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

/**
 * Buttons are set, not styled: a square edge, no glow, no gradient, and the
 * saffron spent only on the one thing a reader is meant to do. A secondary is
 * a hairline; a ghost is just text that happens to be clickable.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-flame-600 text-white hover:bg-flame-700 active:bg-flame-800",
  secondary: "bg-transparent text-ink border border-line-strong hover:border-ink",
  ghost: "bg-transparent text-ink-soft hover:text-ink",
  inverse: "bg-white text-navy-900 hover:bg-sand-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem] gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-12 px-8 text-[0.9375rem] gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-[2px] font-medium tracking-[0.01em] transition-colors duration-200 whitespace-nowrap disabled:opacity-55 disabled:pointer-events-none";

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
    navy: "text-ink-soft",
    flame: "text-flame-700 dark:text-flame-300",
    muted: "text-ink-muted",
  } as const;

  return (
    <span
      className={cn(
        // A standing label, not a chip: capitals and letterspacing carry it,
        // so a row of metadata reads as one line of type instead of a row of
        // coloured pills.
        "inline-flex items-center text-[0.6875rem] font-semibold uppercase tracking-[0.16em]",
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
  /**
   * A section opens the way a page of a journal opens: the standing head, the
   * title under it in the display serif, and a rule drawn the full measure —
   * the rule is what separates the section from what came before, so the
   * section itself needs no band of colour behind it.
   */
  return (
    <div className={cn("mb-8 md:mb-10", align === "center" && "text-center")}>
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-line-strong pb-3",
          align === "center" ? "justify-center" : "justify-between"
        )}
      >
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2 className="mt-1.5 text-3xl md:text-[2.5rem] md:leading-[1.1]">{title}</h2>
        </div>

        {href ? (
          <Link href={href} className="link-rule shrink-0 text-sm text-ink-soft">
            {linkLabel}
          </Link>
        ) : null}
      </div>

      {description ? (
        <p
          className={cn(
            "mt-4 max-w-2xl font-serif text-[1.0625rem] leading-relaxed text-ink-soft",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
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
                  <span aria-hidden className="opacity-40">
                    /
                  </span>
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
  // Nothing here yet is a note to the reader, not a dashed placeholder box.
  return (
    <div className="border-y border-line px-6 py-20 text-center">
      <h3 className="text-2xl text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-3 max-w-md font-serif text-ink-muted">{description}</p>
      ) : null}
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
    <nav
      aria-label="Pagination"
      className="mt-16 flex items-center justify-center gap-5 border-t border-line pt-6"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="link-rule text-sm text-ink-soft">
          Previous
        </Link>
      ) : null}

      <span className="flex items-center gap-3 text-sm tabular-nums">
        {window.map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="text-ink-muted">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={href(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "transition-colors",
                // The current page is the one in ink; the rest are grey. No
                // filled circle needed to say which one you are on.
                item === page
                  ? "font-semibold text-ink underline underline-offset-[0.35em]"
                  : "text-ink-muted hover:text-flame-700"
              )}
            >
              {item}
            </Link>
          )
        )}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className="link-rule text-sm text-ink-soft">
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export { absoluteUrl };
