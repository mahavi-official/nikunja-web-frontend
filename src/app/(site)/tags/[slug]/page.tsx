import { notFound } from "next/navigation";
import { getTags, listPosts, listResearch } from "@/lib/api";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ListingShell } from "@/components/listing/ListingShell";
import { PostCard, ResearchCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";

export const revalidate = 60;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

/** Tags are shared across posts and research, so both are gathered here. */
async function loadTag(slug: string, page: number) {
  const [tags, posts, research] = await Promise.all([
    // 100 is the API's ceiling for a page of tags.
    getTags(100),
    listPosts({ tag: slug, page, limit: 12 }),
    listResearch({ q: slug, limit: 4 }),
  ]);

  return {
    tag: tags.find((item) => item.slug === slug),
    posts,
    research: research.research,
  };
}

export async function generateStaticParams() {
  const tags = await getTags(50);
  return tags.map((tag) => ({ slug: tag.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const page = pageNumber(search.page);
  const { tag, posts } = await loadTag(slug, page);
  const name = tag?.name ?? slug;

  return buildPageMetadata({
    title: page > 1 ? `#${name} — page ${page}` : `#${name}`,
    description: `Everything on Radhakundah tagged ${name}.`,
    path: page > 1 ? `/tags/${slug}?page=${page}` : `/tags/${slug}`,
    // Thin tag pages (fewer than three items) stay out of the index.
    noIndex: posts.meta.total < 3,
    pagination: { page, totalPages: posts.meta.totalPages },
  });
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const page = pageNumber(search.page);
  const { tag, posts, research } = await loadTag(slug, page);

  // An unknown tag with nothing behind it is a real 404, not an empty page.
  if (!tag && !posts.posts.length) notFound();

  const name = tag?.name ?? slug;
  const trail = [
    { name: "Home", url: "/" },
    { name: `#${name}`, url: `/tags/${slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow="Tag"
        title={`#${name}`}
        description={`Writing and publications tagged ${name}.`}
        breadcrumbs={trail}
        total={posts.meta.total}
      >
        {posts.posts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing tagged here yet"
            description="This tag has no published entries."
            action={{ href: "/articles", label: "Browse articles" }}
          />
        )}

        <Pagination page={page} totalPages={posts.meta.totalPages} basePath={`/tags/${slug}`} />

        {research.length ? (
          <section className="mt-16 border-t border-line pt-12">
            <h2 className="text-xl">Related research</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {research.map((item) => (
                <ResearchCard key={item.id} research={item} />
              ))}
            </div>
          </section>
        ) : null}
      </ListingShell>
    </>
  );
}
