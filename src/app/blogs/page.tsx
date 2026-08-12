import { getCategories, listPosts } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { PostListingView } from "@/components/listing/PostListingView";

export const revalidate = 60;

const DESCRIPTION =
  "Field notes, announcements, and shorter writing from the Radhakundah team and its contributors.";

type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { meta } = await listPosts({ placement: "BLOG", page });

  return buildPageMetadata({
    title: page > 1 ? `Blog — page ${page}` : "Blog",
    description: DESCRIPTION,
    path: page > 1 ? `/blogs?page=${page}` : "/blogs",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function BlogsPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);

  const [{ posts, meta }, categories] = await Promise.all([
    listPosts({ placement: "BLOG", page }),
    getCategories("BLOG"),
  ]);

  return (
    <PostListingView
      section="blogs"
      title="Blog"
      description={DESCRIPTION}
      posts={posts}
      meta={meta}
      page={page}
      categories={categories}
    />
  );
}
