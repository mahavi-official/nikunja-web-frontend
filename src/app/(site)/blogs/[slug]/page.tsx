import { notFound, permanentRedirect } from "next/navigation";
import { ApiError, getPost, listComments, listPosts } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { PostArticle } from "@/components/post/PostArticle";

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const { posts } = await listPosts({ placement: "BLOG", limit: 50 });
    // BOTH-placement posts live at /articles — they get no static blog page.
    return posts.filter((post) => post.placement === "BLOG").map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { post, seo } = await getPost(slug);
    if (post.placement !== "BLOG") {
      return { title: "Not found", robots: { index: false, follow: false } };
    }
    return metadataFromSeo(seo, {
      keywords: post.metaKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    });
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getPost(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/blogs/${slug}`);
    }
    throw error;
  }

  const { post, seo } = data;

  // A BOTH-placement post has exactly one canonical URL, under /articles.
  // The CMS stores this rule as a permanent redirect too; we honour it here so
  // shared /blogs links consolidate their link equity instead of duplicating it.
  if (post.placement === "BOTH") permanentRedirect(`/articles/${post.slug}`);
  if (post.placement !== "BLOG") notFound();

  const primaryCategory = post.categories?.[0]?.category;

  const [{ comments, meta: commentMeta }, related] = await Promise.all([
    listComments(post.id),
    listPosts({ placement: "BLOG", category: primaryCategory?.slug, limit: 4 }),
  ]);

  return (
    <PostArticle
      post={post}
      seo={seo}
      comments={comments}
      totalComments={commentMeta.total}
      related={related.posts.filter((item) => item.id !== post.id).slice(0, 3)}
      section="blogs"
    />
  );
}
