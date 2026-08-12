import { ListingShell } from "./ListingShell";
import { PostCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";
import { breadcrumbJsonLd } from "@/lib/seo";
import type { Category, PaginationMeta, Post } from "@/lib/types";

/**
 * Shared body for `/articles`, `/blogs`, and their `/category/{slug}` variants.
 *
 * Category filters are paths, not query strings, so every filtered view is a
 * first-class indexable URL — the taxonomy-driven listing the spec calls for.
 */
export function PostListingView({
  section,
  title,
  description,
  posts,
  meta,
  page,
  categories,
  activeCategory,
}: {
  section: "articles" | "blogs";
  title: string;
  description: string;
  posts: Post[];
  meta: PaginationMeta;
  page: number;
  categories: Category[];
  activeCategory?: Category;
}) {
  const sectionLabel = section === "blogs" ? "Blog" : "Articles";
  const sectionPath = `/${section}`;
  const basePath = activeCategory ? `${sectionPath}/category/${activeCategory.slug}` : sectionPath;

  const trail = [
    { name: "Home", url: "/" },
    { name: sectionLabel, url: sectionPath },
    ...(activeCategory
      ? [{ name: activeCategory.name, url: `${sectionPath}/category/${activeCategory.slug}` }]
      : []),
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow={section === "blogs" ? "Journal" : "Writing"}
        title={title}
        description={description}
        breadcrumbs={trail}
        total={meta.total}
        filters={{
          label: "Category",
          allHref: sectionPath,
          activeSlug: activeCategory?.slug,
          options: categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            href: `${sectionPath}/category/${category.slug}`,
          })),
        }}
      >
        {posts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                // BOTH-placement posts always link to their canonical /articles URL.
                href={
                  section === "blogs" && post.placement === "BLOG"
                    ? `/blogs/${post.slug}`
                    : undefined
                }
                priority={index < 3}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing published here yet"
            description="No entries match this view. Try another category, or browse everything."
            action={{ href: sectionPath, label: `All ${sectionLabel.toLowerCase()}` }}
          />
        )}

        <Pagination page={page} totalPages={meta.totalPages} basePath={basePath} />
      </ListingShell>
    </>
  );
}
