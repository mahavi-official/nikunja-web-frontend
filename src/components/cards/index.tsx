import Link from "next/link";
import { FileText, Images, PlayCircle, Quote } from "lucide-react";
import { CoverImage, RemoteImage } from "@/components/ui/CoverImage";
import { Badge } from "@/components/ui/primitives";
import { cn, formatDate, formatDuration, isoDate, truncate } from "@/lib/format";
import { postPath } from "@/lib/seo";
import type { Author, GallerySegment, Post, PostSummary, Research, Video } from "@/lib/types";

/* ── post ───────────────────────────────────────────────────── */

export function PostCard({
  post,
  href,
  priority = false,
  size = "default",
}: {
  post: Post | PostSummary;
  href?: string;
  priority?: boolean;
  size?: "default" | "compact" | "feature";
}) {
  const target =
    href ?? ("placement" in post ? postPath(post) : `/articles/${post.slug}`);
  const category =
    "categories" in post && post.categories?.length ? post.categories[0].category : null;

  if (size === "compact") {
    return (
      <article className="group flex items-start gap-4">
        <Link
          href={target}
          className="relative aspect-4/3 w-24 shrink-0 self-start overflow-hidden rounded-lg bg-surface-sunken sm:w-28"
          tabIndex={-1}
          aria-hidden
        >
          <CoverImage media={post.coverImage} alt="" size="thumb" sizes="120px" />
        </Link>
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] leading-snug font-semibold">
            <Link href={target} className="transition-colors group-hover:text-flame-600">
              {post.title}
            </Link>
          </h3>
          <time
            dateTime={isoDate(post.publishedAt)}
            className="mt-1.5 block text-xs text-ink-muted"
          >
            {formatDate(post.publishedAt)}
          </time>
        </div>
      </article>
    );
  }

  const isFeature = size === "feature";

  return (
    <article className={cn("card card-interactive group flex flex-col", isFeature && "sm:flex-row")}>
      <Link
        href={target}
        className={cn(
          "relative block overflow-hidden bg-surface-sunken",
          isFeature ? "aspect-16/10 sm:aspect-auto sm:w-1/2" : "aspect-16/10"
        )}
        aria-hidden
        tabIndex={-1}
      >
        <CoverImage
          media={post.coverImage}
          alt=""
          size={isFeature ? "large" : "medium"}
          priority={priority}
          sizes={isFeature ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </Link>

      <div className={cn("flex flex-1 flex-col p-5", isFeature && "sm:justify-center sm:p-8")}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {category ? <Badge tone="flame">{category.name}</Badge> : null}
          <time dateTime={isoDate(post.publishedAt)} className="text-xs text-ink-muted">
            {formatDate(post.publishedAt)}
          </time>
        </div>

        <h3 className={cn("leading-snug", isFeature ? "text-xl md:text-2xl" : "text-lg")}>
          <Link href={target} className="transition-colors group-hover:text-flame-600">
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {truncate(post.excerpt, isFeature ? 220 : 150)}
          </p>
        ) : null}

        {"author" in post && post.author ? (
          <p className="mt-4 text-xs text-ink-muted">By {post.author.name}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ── research ───────────────────────────────────────────────── */

export function ResearchCard({ research }: { research: Research }) {
  const byline = research.authors
    ?.slice()
    .sort((a, b) => a.order - b.order)
    .map((link) => link.author.name)
    .join(", ");

  return (
    <article className="card card-interactive group flex flex-col p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-600 dark:bg-navy-800/60 dark:text-navy-200">
          <FileText className="size-4.5" aria-hidden />
        </span>
        {research.publicationYear ? <Badge tone="muted">{research.publicationYear}</Badge> : null}
      </div>

      <h3 className="text-lg leading-snug">
        <Link
          href={`/research/${research.slug}`}
          className="transition-colors group-hover:text-flame-600"
        >
          {research.title}
        </Link>
      </h3>

      {byline ? <p className="mt-2 text-sm text-ink-soft">{byline}</p> : null}

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        {truncate(research.abstract, 170)}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4 text-xs text-ink-muted">
        {research.category ? <span className="font-medium">{research.category.name}</span> : null}
        {research.journal ? <span className="italic">{research.journal}</span> : null}
        {research.files?.length ? (
          <span>
            {research.files.length} PDF{research.files.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* ── video ──────────────────────────────────────────────────── */

export function VideoCard({ video, priority = false }: { video: Video; priority?: boolean }) {
  return (
    <article className="card card-interactive group">
      <Link href={`/videos/${video.slug}`} className="relative block aspect-video overflow-hidden bg-navy-900">
        <RemoteImage
          src={video.thumbnailUrl}
          alt=""
          priority={priority}
          className="transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-navy-950/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <PlayCircle className="size-14 text-white drop-shadow-lg" aria-hidden />
        </span>
        {video.durationSec ? (
          <span className="absolute right-2.5 bottom-2.5 rounded-md bg-navy-950/85 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white tabular-nums">
            {formatDuration(video.durationSec)}
          </span>
        ) : null}
      </Link>

      <div className="p-5">
        {video.category ? (
          <span className="text-[0.6875rem] font-semibold tracking-wider text-flame-600 uppercase">
            {video.category.name}
          </span>
        ) : null}
        <h3 className="mt-1.5 line-clamp-2 text-base leading-snug">
          <Link href={`/videos/${video.slug}`} className="transition-colors group-hover:text-flame-600">
            {video.title}
          </Link>
        </h3>
        <time dateTime={isoDate(video.publishedAt)} className="mt-2 block text-xs text-ink-muted">
          {formatDate(video.publishedAt)}
        </time>
      </div>
    </article>
  );
}

/* ── gallery segment ────────────────────────────────────────── */

export function GalleryCard({ segment, priority = false }: { segment: GallerySegment; priority?: boolean }) {
  const count = segment._count?.images ?? segment.images?.length;

  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-card)] bg-navy-900">
      <Link href={`/gallery/${segment.slug}`} className="block">
        <div className="relative aspect-4/5 sm:aspect-4/3">
          <CoverImage
            media={segment.coverImage}
            alt={segment.name}
            size="large"
            priority={priority}
            className="opacity-85 transition-all duration-700 group-hover:scale-[1.05] group-hover:opacity-100"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-navy-950 via-navy-950/35 to-transparent"
            aria-hidden
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center gap-2 text-flame-300">
            <Images className="size-3.5" aria-hidden />
            {count !== undefined ? (
              <span className="text-[0.6875rem] font-semibold tracking-wider uppercase">
                {count} image{count === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 text-lg text-white">{segment.name}</h3>
          {segment.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-sand-200/85">{segment.description}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

/* ── author ─────────────────────────────────────────────────── */

export function AuthorCard({ author }: { author: Author }) {
  return (
    <article className="card card-interactive group flex items-start gap-4 p-5">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
        <CoverImage media={author.photo} alt={author.name} size="thumb" sizes="56px" fallbackLabel={author.name.charAt(0)} />
      </div>
      <div className="min-w-0">
        <h3 className="text-base leading-snug">
          <Link href={`/authors/${author.slug}`} className="transition-colors group-hover:text-flame-600">
            {author.name}
          </Link>
        </h3>
        {author.affiliation ? (
          <p className="mt-0.5 text-sm text-ink-soft">{author.affiliation}</p>
        ) : null}
        {author.bio ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{author.bio}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ── pull quote used on the homepage ────────────────────────── */

export function PullQuote({ text, attribution }: { text: string; attribution?: string }) {
  return (
    <figure className="relative mx-auto max-w-3xl text-center">
      <Quote className="mx-auto mb-5 size-7 text-flame-400" aria-hidden />
      <blockquote className="font-serif text-xl leading-relaxed text-balance md:text-2xl">
        {text}
      </blockquote>
      {attribution ? (
        <figcaption className="mt-5 text-xs font-semibold tracking-wider uppercase opacity-60">
          {attribution}
        </figcaption>
      ) : null}
    </figure>
  );
}
