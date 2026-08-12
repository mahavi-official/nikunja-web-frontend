import { permanentRedirect } from "next/navigation";
import { ApiError, getPost, listComments, listPosts } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { PostArticle } from "@/components/post/PostArticle";

// Detail pages tolerate five minutes of staleness.
export const revalidate = 300;
// Pre-render the recent set; serve the long tail on demand.
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const { posts } = await listPosts({ placement: "ARTICLE", limit: 50 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { post, seo } = await getPost(slug);
    if (post.placement === "BLOG") return { title: "Not found", robots: { index: false, follow: false } };

    return metadataFromSeo(seo, {
      keywords: post.metaKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    });
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getPost(slug);
  } catch (error) {
    // Missing or unpublished: check the redirect table, then emit a real 404.
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/articles/${slug}`);
    }
    throw error;
  }

  const { post, seo } = data;

  // A BLOG-placement post is canonical at /blogs/{slug}. Rather than 404 a
  // guessed or mistyped URL, send it there permanently — same rule the CMS
  // applies in reverse for BOTH-placement posts.
  if (post.placement === "BLOG") permanentRedirect(`/blogs/${post.slug}`);

  const primaryCategory = post.categories?.[0]?.category;

  const [{ comments, meta: commentMeta }, related] = await Promise.all([
    listComments(post.id),
    listPosts({ placement: "ARTICLE", category: primaryCategory?.slug, limit: 4 }),
  ]);

  return (
    <PostArticle
      post={post}
      seo={seo}
      comments={comments}
      totalComments={commentMeta.total}
      related={related.posts.filter((item) => item.id !== post.id).slice(0, 3)}
      section="articles"
    />
  );
}
