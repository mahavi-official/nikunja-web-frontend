import Link from "next/link";
import { CoverImage, RemoteImage } from "@/components/ui/CoverImage";
import { cn, formatDate, formatDateShort, formatDuration, isoDate, truncate } from "@/lib/format";
import { postPath } from "@/lib/seo";
import type { Author, GallerySegment, Post, PostSummary, Research, Video } from "@/lib/types";

/**
 * Every entry on this site is set the same way, and the way is a printed one.
 *
 * An entry is opened by a rule, not closed by a border. Nothing is a box: no
 * fill behind it, no shadow under it, no radius to speak of. Nothing moves on
 * hover — the rule darkens and the title takes the saffron, which is what ink
 * does and what a card pretending to be a physical object does not.
 *
 * `ENTRY` is that rule, shared so a grid of research sits on the same baseline
 * grammar as a column of videos.
 */
const ENTRY = "group border-t border-line-strong pt-4 transition-colors hover:border-ink";

/** Title link: ink at rest, saffron under the pointer. No arrow, ever. */
const TITLE_LINK = "transition-colors group-hover:text-flame-700 dark:group-hover:text-flame-300";

/** The apparatus line — date, category, counts. One line of small capitals. */
function MetaLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] font-semibold tracking-[0.16em] uppercase text-ink-muted",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The divider inside a metadata line. Kept out of the markup of each card. */
function Dot() {
  return (
    <span aria-hidden className="opacity-45">
      ·
    </span>
  );
}

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

  /* The list form: a thumbnail the size of a stamp, and the title doing the
     rest. Used where a page needs many entries in a short column. */
  if (size === "compact") {
    return (
      <article className="group flex items-baseline gap-4 border-t border-line pt-3.5 transition-colors hover:border-ink">
        <time
          dateTime={isoDate(post.publishedAt)}
          className="figure-margin w-20 shrink-0 text-[0.6875rem] tracking-[0.08em] uppercase"
        >
          {formatDateShort(post.publishedAt)}
        </time>
        <h3 className="min-w-0 font-display text-[1.0625rem] leading-snug">
          <Link href={target} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>
      </article>
    );
  }

  const isFeature = size === "feature";

  /* The lead: the picture is allowed to be big, and the headline is allowed to
     be the largest thing on the section. Everything under it is text. */
  if (isFeature) {
    return (
      <article className="group border-t-2 border-ink pt-5 transition-colors">
        <Link
          href={target}
          className="relative block aspect-16/9 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken"
          aria-hidden
          tabIndex={-1}
        >
          <CoverImage
            media={post.coverImage}
            alt=""
            size="large"
            priority={priority}
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
        </Link>

        <MetaLine className="mt-5">
          {category ? <span className="text-flame-700 dark:text-flame-300">{category.name}</span> : null}
          {category ? <Dot /> : null}
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
        </MetaLine>

        <h3 className="mt-2.5 text-3xl leading-[1.15] md:text-[2.25rem]">
          <Link href={target} className={TITLE_LINK}>
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className="mt-3 max-w-2xl font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
            {truncate(post.excerpt, 260)}
          </p>
        ) : null}

        {"author" in post && post.author ? (
          <p className="mt-4 text-sm text-ink-muted">By {post.author.name}</p>
        ) : null}
      </article>
    );
  }

  return (
    <article className={cn(ENTRY, "flex flex-col")}>
      <Link
        href={target}
        className="relative block aspect-3/2 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken"
        aria-hidden
        tabIndex={-1}
      >
        <CoverImage
          media={post.coverImage}
          alt=""
          size="medium"
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </Link>

      <MetaLine className="mt-4">
        {category ? <span className="text-flame-700 dark:text-flame-300">{category.name}</span> : null}
        {category ? <Dot /> : null}
        <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
      </MetaLine>

      <h3 className="mt-2 text-xl leading-snug">
        <Link href={target} className={TITLE_LINK}>
          {post.title}
        </Link>
      </h3>

      {post.excerpt ? (
        <p className="mt-2 line-clamp-3 font-serif leading-relaxed text-ink-soft">
          {truncate(post.excerpt, 160)}
        </p>
      ) : null}

      {"author" in post && post.author ? (
        <p className="mt-3 text-sm text-ink-muted">By {post.author.name}</p>
      ) : null}
    </article>
  );
}

/* ── research ───────────────────────────────────────────────── */

/** Authors in submitted order, as they would be printed on the paper. */
function byline(research: Research): string {
  return (
    research.authors
      ?.slice()
      .sort((a, b) => a.order - b.order)
      .map((link) => link.author.name)
      .join(", ") ?? ""
  );
}

function fileNote(research: Research): string | null {
  const count = research.files?.length ?? 0;
  if (!count) return null;
  return `${count} PDF${count > 1 ? "s" : ""}`;
}

export function ResearchCard({ research }: { research: Research }) {
  const authors = byline(research);
  const files = fileNote(research);

  return (
    <article className={cn(ENTRY, "flex flex-col")}>
      <MetaLine>
        {research.publicationYear ? <span>{research.publicationYear}</span> : null}
        {research.publicationYear && research.category ? <Dot /> : null}
        {research.category ? <span>{research.category.name}</span> : null}
      </MetaLine>

      <h3 className="mt-2 text-xl leading-snug">
        <Link href={`/research/${research.slug}`} className={TITLE_LINK}>
          {research.title}
        </Link>
      </h3>

      {authors ? <p className="mt-2 text-sm text-ink-soft">{authors}</p> : null}

      <p className="mt-3 line-clamp-3 font-serif leading-relaxed text-ink-muted">
        {truncate(research.abstract, 170)}
      </p>

      {research.journal || files ? (
        <p className="mt-4 text-sm text-ink-muted">
          {research.journal ? <span className="italic">{research.journal}</span> : null}
          {research.journal && files ? <span aria-hidden> · </span> : null}
          {files}
        </p>
      ) : null}
    </article>
  );
}

/**
 * The same paper as a line in an index: year held out in the margin, the title
 * set against it, the citation underneath. A run of these reads like the
 * contents page of a journal, which is what a run of papers is.
 */
export function ResearchIndexRow({ research }: { research: Research }) {
  const authors = byline(research);
  const files = fileNote(research);

  return (
    <article className="group grid grid-cols-[3.5rem_1fr] gap-x-5 py-5 transition-colors hover:border-ink sm:grid-cols-[5rem_1fr] md:gap-x-8">
      <span className="figure-margin pt-1.5 text-sm tabular-nums">
        {research.publicationYear ?? "—"}
      </span>

      <div className="min-w-0">
        <h3 className="text-xl leading-snug md:text-2xl">
          <Link href={`/research/${research.slug}`} className={TITLE_LINK}>
            {research.title}
          </Link>
        </h3>

        <p className="mt-2 text-sm text-ink-soft">
          {authors}
          {authors && research.journal ? <span aria-hidden> · </span> : null}
          {research.journal ? <span className="italic">{research.journal}</span> : null}
          {(authors || research.journal) && files ? <span aria-hidden> · </span> : null}
          {files ? <span className="text-ink-muted">{files}</span> : null}
        </p>
      </div>
    </article>
  );
}

/* ── video ──────────────────────────────────────────────────── */

export function VideoCard({ video, priority = false }: { video: Video; priority?: boolean }) {
  return (
    <article className={cn(ENTRY, "flex flex-col")}>
      <Link
        href={`/videos/${video.slug}`}
        className="relative block aspect-video overflow-hidden rounded-[var(--radius-card)] bg-navy-900"
        aria-hidden
        tabIndex={-1}
      >
        <RemoteImage src={video.thumbnailUrl} alt="" priority={priority} />
      </Link>

      <MetaLine className="mt-4">
        {/* A running time is the honest way to say "this is a video" — more
            useful than a play button drawn over the picture. */}
        {video.durationSec ? (
          <span className="tabular-nums tracking-[0.08em]">{formatDuration(video.durationSec)}</span>
        ) : null}
        {video.durationSec && video.category ? <Dot /> : null}
        {video.category ? <span>{video.category.name}</span> : null}
      </MetaLine>

      <h3 className="mt-2 line-clamp-2 text-lg leading-snug">
        <Link href={`/videos/${video.slug}`} className={TITLE_LINK}>
          {video.title}
        </Link>
      </h3>

      <time dateTime={isoDate(video.publishedAt)} className="mt-2 text-sm text-ink-muted">
        {formatDate(video.publishedAt)}
      </time>
    </article>
  );
}

/* ── gallery segment ────────────────────────────────────────── */

/**
 * The photograph is left alone — no scrim poured over it, no type printed
 * across it. The caption sits underneath where a caption belongs.
 */
export function GalleryCard({ segment, priority = false }: { segment: GallerySegment; priority?: boolean }) {
  const count = segment._count?.images ?? segment.images?.length;

  return (
    <article className="group">
      <Link href={`/gallery/${segment.slug}`} className="block">
        <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
          <CoverImage media={segment.coverImage} alt={segment.name} size="large" priority={priority} />
        </div>

        <div className="mt-3 border-t border-line pt-3 transition-colors group-hover:border-ink">
          <h3 className="text-lg leading-snug">
            <span className={TITLE_LINK}>{segment.name}</span>
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {count !== undefined ? (
              <span className="tabular-nums">
                {count} photograph{count === 1 ? "" : "s"}
              </span>
            ) : null}
            {count !== undefined && segment.description ? <span aria-hidden> · </span> : null}
            {segment.description ? (
              <span className="line-clamp-1 align-baseline">{segment.description}</span>
            ) : null}
          </p>
        </div>
      </Link>
    </article>
  );
}

/* ── author ─────────────────────────────────────────────────── */

export function AuthorCard({ author }: { author: Author }) {
  return (
    <article className={cn(ENTRY, "flex items-start gap-4")}>
      <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
        <CoverImage
          media={author.photo}
          alt={author.name}
          size="thumb"
          sizes="56px"
          fallbackLabel={author.name.charAt(0)}
        />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg leading-snug">
          <Link href={`/authors/${author.slug}`} className={TITLE_LINK}>
            {author.name}
          </Link>
        </h3>
        {author.affiliation ? (
          <p className="mt-0.5 text-sm text-ink-soft">{author.affiliation}</p>
        ) : null}
        {author.bio ? (
          <p className="mt-2 line-clamp-2 font-serif text-sm leading-relaxed text-ink-muted">
            {author.bio}
          </p>
        ) : null}
      </div>
    </article>
  );
}
