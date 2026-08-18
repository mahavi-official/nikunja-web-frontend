import { getCategories, listPosts } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { PostListingView } from "@/components/listing/PostListingView";

// Listings: one minute of staleness at worst.
export const revalidate = 60;

const DESCRIPTION =
  "Considered, edited writing on the history, philosophy, and practice surrounding Radha Kunda.";

type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { meta } = await listPosts({ placement: "ARTICLE", page });

  return buildPageMetadata({
    title: page > 1 ? `Articles — page ${page}` : "Articles",
    description: DESCRIPTION,
    // Page 2 canonicalises to itself, not to page 1.
    path: page > 1 ? `/articles?page=${page}` : "/articles",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function ArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);

  const [{ posts, meta }, categories] = await Promise.all([
    listPosts({ placement: "ARTICLE", page }),
    getCategories("ARTICLE"),
  ]);

  return (
    <PostListingView
      section="articles"
      title="Articles"
      description={DESCRIPTION}
      posts={posts}
      meta={meta}
      page={page}
      categories={categories}
    />
  );
}
