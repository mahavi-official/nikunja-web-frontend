import { notFound } from "next/navigation";
import { getCategories, listPosts } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { PostListingView } from "@/components/listing/PostListingView";

export const revalidate = 60;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateStaticParams() {
  const categories = await getCategories("BLOG");
  return categories.map((category) => ({ slug: category.slug }));
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
  const category = (await getCategories("BLOG")).find((item) => item.slug === slug);

  if (!category) return { title: "Not found", robots: { index: false, follow: false } };

  const { meta } = await listPosts({ placement: "BLOG", category: slug, page });
  const base = `/blogs/category/${slug}`;

  return buildPageMetadata({
    title: category.metaTitle || (page > 1 ? `${category.name} — page ${page}` : `${category.name} posts`),
    description:
      category.metaDescription || category.description || `Blog posts filed under ${category.name}.`,
    path: page > 1 ? `${base}?page=${page}` : base,
    noIndex: category.noIndex || meta.total < 3,
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const page = pageNumber(search.page);

  const categories = await getCategories("BLOG");
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const { posts, meta } = await listPosts({ placement: "BLOG", category: slug, page });

  return (
    <PostListingView
      section="blogs"
      title={category.name}
      description={category.description || `Blog posts filed under ${category.name}.`}
      posts={posts}
      meta={meta}
      page={page}
      categories={categories}
      activeCategory={category}
    />
  );
}
