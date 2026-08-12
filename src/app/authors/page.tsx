import { listAuthors } from "@/lib/api";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ListingShell } from "@/components/listing/ListingShell";
import { AuthorCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";

export const revalidate = 3600;

type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { meta } = await listAuthors(page);

  return buildPageMetadata({
    title: page > 1 ? `Authors — page ${page}` : "Authors",
    description: "The scholars and writers whose work is published on Radhakundah.",
    path: page > 1 ? `/authors?page=${page}` : "/authors",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function AuthorsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { authors, meta } = await listAuthors(page);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Authors", url: "/authors" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow="Contributors"
        title="Authors"
        description="The scholars and writers whose publications are collected here. Each has an indexable page listing their work."
        breadcrumbs={trail}
        total={meta.total}
      >
        {authors.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No authors listed yet"
            description="Author profiles appear once their publications are released."
            action={{ href: "/research", label: "Browse research" }}
          />
        )}

        <Pagination page={page} totalPages={meta.totalPages} basePath="/authors" />
      </ListingShell>
    </>
  );
}
