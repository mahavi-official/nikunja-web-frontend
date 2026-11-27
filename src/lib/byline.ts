import type { Media, PostByline } from "./types";

export interface Credit {
  name: string;
  /** Present for people in the Authors directory; links to /authors/{slug}. */
  slug?: string;
  affiliation?: string | null;
  photo?: Media | null;
}

/**
 * Who a post is credited to. Bylines chosen in the editor win, in their order;
 * a post with none is credited to the staff account that created it, which is
 * how every post read before bylines existed.
 */
export function postCredits(post: {
  author?: { name: string } | null;
  authors?: PostByline[] | null;
}): Credit[] {
  const chosen = [...(post.authors ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(({ author }) => ({
      name: author.name,
      slug: author.slug,
      affiliation: author.affiliation,
      photo: author.photo,
    }));
  if (chosen.length) return chosen;
  return post.author?.name ? [{ name: post.author.name }] : [];
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
