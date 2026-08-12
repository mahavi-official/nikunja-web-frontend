import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

interface FilterConfig {
  label: string;
  /** Where "All" points — the unfiltered listing. */
  allHref: string;
  activeSlug?: string;
  /** Each option is its own crawlable URL, e.g. /articles/category/philosophy. */
  options: { slug: string; name: string; href: string }[];
}

/**
 * The frame every listing page shares: page header, breadcrumbs, an optional
 * taxonomy filter rail, and a result count.
 *
 * Filters are links, not client state — each filtered view is its own
 * crawlable URL, which is the whole point of a taxonomy-driven listing.
 */
export function ListingShell({
  eyebrow,
  title,
  description,
  breadcrumbs,
  filters,
  total,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs: { name: string; url: string }[];
  filters?: FilterConfig;
  total?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs trail={breadcrumbs} />
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="mt-2 text-3xl md:text-5xl">{title}</h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
      </header>

      <div className="container-page py-10 md:py-14">
        {filters && filters.options.length ? (
          <nav aria-label={`${filters.label} filter`} className="mb-10">
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterPill href={filters.allHref} active={!filters.activeSlug}>
                  All
                </FilterPill>
              </li>
              {filters.options.map((option) => (
                <li key={option.slug}>
                  <FilterPill href={option.href} active={filters.activeSlug === option.slug}>
                    {option.name}
                  </FilterPill>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {typeof total === "number" && total > 0 ? (
          <p className="mb-6 text-sm text-ink-muted">
            {total} {total === 1 ? "result" : "results"}
          </p>
        ) : null}

        {children}
      </div>
    </>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-navy-800 bg-navy-800 text-white dark:border-navy-600 dark:bg-navy-600"
          : "border-line-strong text-ink-soft hover:border-navy-400 hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}
