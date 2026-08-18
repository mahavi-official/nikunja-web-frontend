/**
 * Response types mirroring the Radhakundah API.
 *
 * These follow `src/schemas/entities.ts` in the backend. Fields the public
 * endpoints strip (`content` on list rows, `extractedText`, S3 keys) are
 * modelled as optional rather than removed, so one type serves both shapes.
 */

// ───────────────────────────── envelope ─────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// ───────────────────────────── enums ─────────────────────────────

export type Placement = "ARTICLE" | "BLOG" | "BOTH";
export type ContentStatus = "DRAFT" | "PUBLISHED";
export type CategoryScope = "ARTICLE" | "BLOG" | "RESEARCH";
export type Role = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "MEMBER";

// ───────────────────────────── seo ─────────────────────────────

/** Resolved, ready-to-render head data. The backend applies every fallback. */
export interface Seo {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  openGraph: {
    title: string;
    description: string;
    image?: string;
    type: "article" | "website" | "video.other";
    url: string;
    siteName: string;
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image?: string;
  };
  jsonLd: Record<string, unknown>[];
}

// ───────────────────────────── media ─────────────────────────────

export interface MediaVariant {
  webp?: string;
  original?: string;
}

export interface Media {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  folder: string;
  variants: Record<"thumb" | "medium" | "large" | "og", MediaVariant> | null;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────────── taxonomy ─────────────────────────────

export interface Category {
  id: string;
  scope: CategoryScope;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  metaTitle: string | null;
  metaDescription: string | null;
  noIndex: boolean;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
}

// ───────────────────────────── posts ─────────────────────────────

export interface PostAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  placement: Placement;
  status: ContentStatus;
  title: string;
  slug: string;
  excerpt: string | null;
  /** Sanitised HTML. Absent on list rows — the API strips bodies from listings. */
  content?: string;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  commentsEnabled: boolean;
  metaKeywords: string | null;
  noIndex: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Only the admin endpoints return these — the public projection strips the
   * raw meta fields because it sends a fully resolved `Seo` object instead.
   */
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  author: PostAuthor;
  coverImage: Media | null;
  ogImage: Media | null;
  categories: { categoryId: string; postId: string; category: Category }[];
  tags: { tagId: string; postId: string; tag: Tag }[];
}

/** Compact card shape used by the homepage rails. */
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | null;
  coverImage: Media | null;
}

// ───────────────────────────── research ─────────────────────────────

export interface Author {
  id: string;
  name: string;
  slug: string;
  affiliation: string | null;
  bio: string | null;
  email: string | null;
  orcid: string | null;
  photo: Media | null;
  noIndex: boolean;
  research?: { research: Research }[];
}

/** Public projection: metadata only, never a URL or an S3 key. */
export interface ResearchFile {
  id: string;
  label: string;
  fileName: string;
  sizeBytes: number;
  pageCount: number | null;
}

export interface ResearchAuthorLink {
  researchId: string;
  authorId: string;
  order: number;
  isCorresponding: boolean;
  author: Author;
}

export interface Research {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  categoryId: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  doi: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publicationYear: number | null;
  keywords: string[];
  noIndex: boolean;
  createdAt: string;
  updatedAt: string;
  /** Admin projection only — see the note on `Post`. */
  metaTitle?: string | null;
  metaDescription?: string | null;
  category?: Category | null;
  ogImage?: Media | null;
  authors: ResearchAuthorLink[];
  tags?: { tagId: string; researchId: string; tag: Tag }[];
  files?: ResearchFile[];
}

// ───────────────────────────── gallery ─────────────────────────────

export interface GalleryImage {
  id: string;
  segmentId: string;
  mediaId: string;
  alt: string;
  caption: string | null;
  order: number;
  media: Media;
}

export interface GallerySegment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  isPublished: boolean;
  noIndex: boolean;
  createdAt: string;
  updatedAt: string;
  coverImage: Media | null;
  /** Only on single-segment reads. */
  images?: GalleryImage[];
  /** Only on list reads. */
  _count?: { images: number };
}

// ───────────────────────────── videos ─────────────────────────────

export interface Video {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  youtubeId: string;
  thumbnailUrl: string;
  durationSec: number | null;
  categoryId: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  noIndex: boolean;
  category?: VideoCategory | null;
}

// ───────────────────────────── engagement ─────────────────────────────

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

// ───────────────────────────── site content ─────────────────────────────

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageId: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  order: number;
  isActive: boolean;
  image: Media;
}

/** Shape of `Page.sections` for `key = "about"`. Owned by the frontend. */
export interface AboutSections {
  about?: string;
  mission?: string;
  vision?: string;
  objectives?: string[];
  team?: { name: string; role?: string; bio?: string; photoUrl?: string }[];
  journey?: { year?: string; title?: string; description?: string }[];
  contact?: string;
}

export interface Page<S = Record<string, unknown>> {
  id: string;
  key: string;
  title: string;
  sections: S;
  noIndex: boolean;
  updatedAt: string;
}

/** Flat dotted-key map: `site.title`, `contact.email`, `social.youtube`, … */
export type Settings = Record<string, string | number | boolean | null>;

export interface SearchResult {
  type: "post" | "research" | "video";
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string | null;
  rank: number;
}

export interface UrlRedirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isAuto: boolean;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  status: "WHITELISTED" | "ACTIVE" | "SUSPENDED";
  editorModules: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

// ───────────────────────────── aggregates ─────────────────────────────

export interface HomePayload {
  hero: HeroSlide[];
  featuredResearch: Research[];
  featuredPosts: PostSummary[];
  latestBlogs: PostSummary[];
  latestVideos: Video[];
  gallery: GallerySegment[];
  recentUpdates: {
    type: "post" | "research" | "video";
    title: string;
    slug: string;
    publishedAt: string | null;
  }[];
}
