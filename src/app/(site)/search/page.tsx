import Link from "next/link";
import { FileText, PlayCircle, SearchIcon, Sparkles } from "lucide-react";
import { search } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { Breadcrumbs, EmptyState, Pagination } from "@/components/ui/primitives";
import { formatDate, isoDate, truncate } from "@/lib/format";
import { cn } from "@/lib/format";

// Results depend entirely on the query string, so nothing is prerendered.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; type?: string; page?: string }>;

const TYPES = [
  { value: "all", label: "Everything" },
  { value: "post", label: "Articles & blogs" },
  { value: "research", label: "Research" },
  { value: "video", label: "Videos" },
] as const;

const RESULT_META = {
  post: { Icon: FileText, label: "Article", path: "/articles" },
  research: { Icon: Sparkles, label: "Research", path: "/research" },
  video: { Icon: PlayCircle, label: "Video", path: "/videos" },
} as const;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;

  return buildPageMetadata({
    title: q ? `Search: ${q}` : "Search",
    description: "Search the full text of every article, paper, and video on Radhakundah.",
    path: "/search",
    // Search result pages are never indexed — thin, infinite, and duplicative.
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = (TYPES.find((item) => item.value === params.type)?.value ?? "all") as
    | "all"
    | "post"
    | "research"
    | "video";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { results, meta } = query
    ? await search(query, type, page)
    : { results: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  return (
    <>
      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs
            trail={[
              { name: "Home", url: "/" },
              { name: "Search", url: "/search" },
            ]}
          />
          <h1 className="text-3xl md:text-5xl">Search</h1>

          <form action="/search" method="get" role="search" className="mt-6 max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 focus-within:border-flame-400">
              <SearchIcon className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <label htmlFor="q" className="sr-only">
                Search query
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Papers, articles, talks…"
                className="h-13 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted"
              />
              {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
              <button
                type="submit"
                className="my-2 h-9 rounded-full bg-flame-500 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-600"
              >
                Search
              </button>
            </div>
          </form>

          <nav aria-label="Filter results by type" className="mt-5 flex flex-wrap gap-2">
            {TYPES.map((option) => (
              <Link
                key={option.value}
                href={`/search?q=${encodeURIComponent(query)}${option.value === "all" ? "" : `&type=${option.value}`}`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  option.value === type
                    ? "bg-navy-800 text-white dark:bg-navy-600"
                    : "text-ink-soft hover:bg-surface-sunken"
                )}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="container-page py-10 md:py-14">
        {!query ? (
          <EmptyState
            title="What are you looking for?"
            description="Full-text search runs across articles, blog posts, research abstracts, the text inside the papers themselves, and video descriptions."
          />
        ) : results.length ? (
          <>
            <p className="mb-8 text-sm text-ink-muted">
              {meta.total} result{meta.total === 1 ? "" : "s"} for “{query}”
            </p>

            <ol className="divide-y divide-[color:var(--border-subtle)]">
              {results.map((result) => {
                const { Icon, label, path } = RESULT_META[result.type];
                return (
                  <li key={`${result.type}-${result.id}`} className="group py-6">
                    <Link href={`${path}/${result.slug}`} className="block">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-flame-600 uppercase">
                        <Icon className="size-3.5" aria-hidden />
                        {label}
                      </div>
                      <h2 className="mt-2 text-xl leading-snug transition-colors group-hover:text-flame-600">
                        {result.title}
                      </h2>
                      {result.excerpt ? (
                        <p className="mt-2 max-w-3xl leading-relaxed text-ink-soft">
                          {truncate(result.excerpt, 220)}
                        </p>
                      ) : null}
                      <time
                        dateTime={isoDate(result.publishedAt)}
                        className="mt-2 block text-xs text-ink-muted"
                      >
                        {formatDate(result.publishedAt)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ol>

            <Pagination
              page={page}
              totalPages={meta.totalPages}
              basePath="/search"
              searchParams={{ q: query, type: type === "all" ? undefined : type }}
            />
          </>
        ) : (
          <EmptyState
            title={`Nothing found for “${query}”`}
            description="Try a shorter phrase, a different spelling, or browse the sections directly."
            action={{ href: "/research", label: "Browse research" }}
          />
        )}
      </div>
    </>
  );
}
