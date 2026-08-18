import Link from "next/link";
import { getCategories, listResearch } from "@/lib/api";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ListingShell } from "@/components/listing/ListingShell";
import { ResearchCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

export const revalidate = 60;

const DESCRIPTION =
  "Peer research and scholarly publications on Radha Kunda — abstracts and academic metadata open to all, full texts available to signed-in readers.";

type SearchParams = Promise<{ page?: string; category?: string; year?: string; q?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

/** Publication years offered as a secondary filter. */
const YEARS = Array.from({ length: 8 }, (_, index) => new Date().getUTCFullYear() - index);

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const { meta } = await listResearch({ page });

  return buildPageMetadata({
    title: page > 1 ? `Research — page ${page}` : "Research",
    description: DESCRIPTION,
    path: page > 1 ? `/research?page=${page}` : "/research",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const year = params.year ? Number(params.year) : undefined;

  const [{ research, meta }, categories] = await Promise.all([
    listResearch({ page, category: params.category, year, q: params.q }),
    getCategories("RESEARCH"),
  ]);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Research", url: "/research" },
  ];

  const withParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...patch, page: undefined })) {
      if (value) next.set(key, String(value));
    }
    const qs = next.toString();
    return qs ? `/research?${qs}` : "/research";
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow="Publications"
        title="Research"
        description={DESCRIPTION}
        breadcrumbs={trail}
        total={meta.total}
        filters={{
          label: "Category",
          allHref: withParams({ category: undefined }),
          activeSlug: params.category,
          options: categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            href: withParams({ category: category.slug }),
          })),
        }}
      >
        {/* Year is a secondary axis, so it stays a query filter rather than a path. */}
        <nav aria-label="Filter by year" className="-mt-4 mb-10 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
            Year
          </span>
          <Link
            href={withParams({ year: undefined })}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              !year ? "bg-navy-800 text-white dark:bg-navy-600" : "text-ink-soft hover:bg-surface-sunken"
            )}
          >
            Any
          </Link>
          {YEARS.map((candidate) => (
            <Link
              key={candidate}
              href={withParams({ year: String(candidate) })}
              className={cn(
                "rounded-full px-3 py-1 text-sm tabular-nums transition-colors",
                year === candidate ? "bg-navy-800 text-white dark:bg-navy-600" : "text-ink-soft hover:bg-surface-sunken"
              )}
            >
              {candidate}
            </Link>
          ))}
        </nav>

        {research.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {research.map((item) => (
              <ResearchCard key={item.id} research={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No publications match this view"
            description="Try clearing the filters, or search the full text of every paper."
            action={{ href: "/research", label: "All research" }}
          />
        )}

        <Pagination
          page={page}
          totalPages={meta.totalPages}
          basePath="/research"
          searchParams={{ category: params.category, year: params.year, q: params.q }}
        />
      </ListingShell>
    </>
  );
}
