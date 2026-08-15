import Link from "next/link";
import { Clock, Eye } from "lucide-react";
import { Badge, Breadcrumbs, JsonLd, SectionHeading } from "@/components/ui/primitives";
import { CoverImage } from "@/components/ui/CoverImage";
import { PostCard } from "@/components/cards";
import { ShareRow } from "@/components/post/ShareRow";
import { ViewCounter } from "@/components/post/ViewCounter";
import { Engagement } from "@/components/post/Engagement";
import { formatCount, formatDate, isoDate, readingTime } from "@/lib/format";
import { postPath } from "@/lib/seo";
import type { Comment, Post, Seo } from "@/lib/types";

/**
 * One renderer for both `/articles/{slug}` and `/blogs/{slug}` — the two routes
 * differ only in their breadcrumb and their related rail, never in the piece
 * itself.
 */
export function PostArticle({
  post,
  seo,
  comments,
  totalComments,
  related,
  section,
}: {
  post: Post;
  seo: Seo;
  comments: Comment[];
  totalComments: number;
  related: Post[];
  section: "articles" | "blogs";
}) {
  const sectionLabel = section === "blogs" ? "Blog" : "Articles";
  const sectionPath = `/${section}`;

  const trail = [
    { name: "Home", url: "/" },
    { name: sectionLabel, url: sectionPath },
    { name: post.title, url: postPath(post) },
  ];

  return (
    <>
      <JsonLd data={seo.jsonLd} />
      <ViewCounter kind="posts" slug={post.slug} />

      <article>
        <header className="border-b border-line bg-surface-raised">
          <div className="container-page py-10 md:py-14">
            <Breadcrumbs trail={trail} />

            <div className="mx-auto max-w-3xl">
              {post.categories?.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  {post.categories.map(({ category }) => (
                    <Link key={category.id} href={`${sectionPath}?category=${category.slug}`}>
                      <Badge tone="flame">{category.name}</Badge>
                    </Link>
                  ))}
                </div>
              ) : null}

              <h1 className="mt-4 text-3xl leading-[1.12] md:text-5xl">{post.title}</h1>

              {post.excerpt ? (
                <p className="mt-5 text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                <span className="font-medium text-ink-soft">{post.author.name}</span>
                <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  {readingTime(post.content)} min read
                </span>
                {post.viewCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="size-3.5" aria-hidden />
                    {formatCount(post.viewCount)} views
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {post.coverImage ? (
          <div className="container-page py-8 md:py-10">
            <div className="relative mx-auto aspect-16/9 max-w-5xl overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
              <CoverImage
                media={post.coverImage}
                alt={post.title}
                size="large"
                sizes="(min-width: 1024px) 64rem, 100vw"
                priority
              />
            </div>
          </div>
        ) : null}

        <div className="container-page py-8 md:py-12">
          <div className="mx-auto max-w-3xl">
            {/* HTML sanitised server-side by sanitize-html when the post was saved. */}
            <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.content ?? "" }} />

            {post.tags?.length ? (
              <div className="mt-12 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                  Tags
                </span>
                {post.tags.map(({ tag }) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="rounded-full border border-line-strong px-3 py-1 text-sm text-ink-soft transition-colors hover:border-flame-400 hover:text-flame-600"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-10 border-t border-line pt-6">
              <ShareRow url={seo.canonical} title={post.title} />
            </div>

            <aside className="mt-12 flex items-start gap-4 rounded-[var(--radius-card)] bg-surface-sunken p-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-800 text-lg font-semibold text-white dark:bg-navy-600">
                {post.author.name.charAt(0)}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wider text-ink-muted uppercase">
                  Written by
                </p>
                <p className="mt-1 font-serif text-lg font-semibold">{post.author.name}</p>
              </div>
            </aside>

            <Engagement
              postId={post.id}
              commentsEnabled={post.commentsEnabled}
              initialComments={comments}
              totalComments={totalComments}
            />
          </div>
        </div>
      </article>

      {related.length ? (
        <section className="border-t border-line bg-surface-raised py-16">
          <div className="container-page">
            <SectionHeading
              eyebrow="Keep reading"
              title={section === "blogs" ? "More from the blog" : "Related articles"}
              href={sectionPath}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <PostCard
                  key={item.id}
                  post={item}
                  href={
                    section === "blogs" && item.placement !== "BOTH"
                      ? `/blogs/${item.slug}`
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
