import Link from "next/link";
import { Hero, StaticHero } from "@/components/home/Hero";
import { GalleryCard, PostCard, ResearchIndexRow, VideoCard } from "@/components/cards";
import { ButtonLink, SectionHeading } from "@/components/ui/primitives";
import { getHome, getSettings } from "@/lib/api";
import { buildPageMetadata, SITE_TAGLINE } from "@/lib/seo";
import { formatDate, formatDateShort, isoDate } from "@/lib/format";

// Listings: one minute of staleness at worst.
export const revalidate = 0;

export async function generateMetadata() {
  const settings = await getSettings();
  const title = (settings["site.title"] as string) || "Radhakundah";

  return {
    ...buildPageMetadata({
      title: `${title} — ${SITE_TAGLINE}`,
      description:
        (settings["site.description"] as string) ||
        "Research publications, articles, galleries, and recorded talks from Radha Kunda.",
      path: "/",
    }),
    // The homepage owns the bare domain as its canonical.
    alternates: { canonical: "/" },
  };
}

const UPDATE_PATH = {
  post: "/articles",
  research: "/research",
  video: "/videos",
} as const;

/** What each kind of update is called in the margin of the list. */
const UPDATE_LABEL = {
  post: "Article",
  research: "Paper",
  video: "Video",
} as const;

/** The contents strip: what a first-time reader will find, and where. */
const CONTENTS = [
  { href: "/research", name: "Research", note: "Papers with their citations, abstracts, and PDFs." },
  { href: "/articles", name: "Articles", note: "Long-form writing on the place and its texts." },
  { href: "/gallery", name: "Gallery", note: "Photographs, gathered by season and observance." },
  { href: "/videos", name: "Videos", note: "Talks, kirtan, and recorded footage." },
];

export default async function HomePage() {
  const home = await getHome();
  const hasContent =
    home.featuredResearch.length ||
    home.featuredPosts.length ||
    home.latestBlogs.length ||
    home.latestVideos.length ||
    home.gallery.length;

  return (
    <>
      {home.hero.length ? <Hero slides={home.hero} /> : <StaticHero />}

      {/* The standfirst and the contents, side by side — what this is on the
          left, where to go on the right. Asymmetric on purpose: a page laid out
          in three equal columns is a page that has stopped thinking. */}
      <section className="border-b border-line">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="font-serif text-xl leading-relaxed text-ink md:text-2xl md:leading-[1.55]">
              Radha Kunda has been written about for five hundred years, and photographed for a
              hundred. This is where we keep that work: peer-reviewed papers alongside the essays,
              pictures, and recordings that surround them, published in full and free to read.
            </p>
            <p className="mt-5 max-w-xl text-ink-soft">
              Nothing here is behind a paywall. Signing in only unlocks the full PDFs, which we host
              ourselves so they stay available.
            </p>
          </div>

          <div className="lg:col-span-5">
            <h2 className="eyebrow">Contents</h2>
            <ul className="rule-list mt-4 border-t border-line-strong">
              {CONTENTS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-baseline gap-4 py-3 transition-colors hover:text-flame-700 dark:hover:text-flame-300"
                  >
                    <span className="w-24 shrink-0 font-display text-lg">{item.name}</span>
                    <span className="text-sm text-ink-muted">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {!hasContent ? (
        <section className="container-page py-24 text-center">
          <h2 className="text-3xl">The library is being prepared</h2>
          <p className="mx-auto mt-3 max-w-md font-serif text-ink-soft">
            Published research, articles, and media will appear here as the editorial team releases
            them.
          </p>
          <ButtonLink href="/about" variant="secondary" className="mt-8">
            About this project
          </ButtonLink>
        </section>
      ) : null}

      {/* Featured research, set as an index: year in the margin, citation under
          the title. This is the shape a table of contents has had for a long
          time, and it is legible at a glance in a way four equal tiles are not. */}
      {home.featuredResearch.length ? (
        <section className="container-page py-16 md:py-20">
          <SectionHeading
            eyebrow="Publications"
            title="Recent papers"
            description="Selected by the editors. Abstracts are open to everyone; the full texts are a click away once you are signed in."
            href="/research"
            linkLabel="All research"
          />
          <div className="rule-list border-t border-line">
            {home.featuredResearch.map((item) => (
              <ResearchIndexRow key={item.id} research={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured articles: one lead, the rest as a dated column beside it. */}
      {home.featuredPosts.length ? (
        <section className="border-t border-line bg-surface-sunken py-16 md:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Writing"
              title="Featured articles"
              href="/articles"
              linkLabel="All articles"
            />
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-7">
                <PostCard post={home.featuredPosts[0]} size="feature" priority />
              </div>

              {home.featuredPosts.length > 1 ? (
                <div className="lg:col-span-5">
                  <h3 className="eyebrow mb-4">Also this month</h3>
                  <div className="flex flex-col">
                    {home.featuredPosts.slice(1, 6).map((post) => (
                      <PostCard key={post.id} post={post} size="compact" />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Blogs, with the running log of everything published beside them. */}
      {home.latestBlogs.length || home.recentUpdates.length ? (
        <section className="container-page grid gap-12 py-16 md:py-20 lg:grid-cols-12 lg:gap-14">
          {home.latestBlogs.length ? (
            <div className="lg:col-span-8">
              <SectionHeading eyebrow="Journal" title="From the blog" href="/blogs" />
              <div className="grid gap-8 sm:grid-cols-2">
                {home.latestBlogs.map((post) => (
                  <PostCard key={post.id} post={post} href={`/blogs/${post.slug}`} />
                ))}
              </div>
            </div>
          ) : null}

          {home.recentUpdates.length ? (
            <aside className="lg:col-span-4">
              <h2 className="eyebrow">Lately</h2>
              <ul className="rule-list mt-4 border-t border-line-strong">
                {home.recentUpdates.slice(0, 8).map((update) => (
                  <li key={`${update.type}-${update.slug}`} className="group py-3.5">
                    <div className="flex items-baseline gap-3">
                      <time
                        dateTime={isoDate(update.publishedAt)}
                        className="figure-margin w-20 shrink-0 text-[0.6875rem] tracking-[0.08em] uppercase"
                      >
                        {formatDateShort(update.publishedAt)}
                      </time>
                      <div className="min-w-0">
                        <Link
                          href={`${UPDATE_PATH[update.type]}/${update.slug}`}
                          className="font-display leading-snug transition-colors group-hover:text-flame-700 dark:group-hover:text-flame-300"
                        >
                          {update.title}
                        </Link>
                        <span className="mt-1 block text-[0.6875rem] font-semibold tracking-[0.16em] text-ink-muted uppercase">
                          {UPDATE_LABEL[update.type]}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </section>
      ) : null}

      {/* Gallery */}
      {home.gallery.length ? (
        <section className="border-t border-line bg-surface-sunken py-16 md:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Gallery"
              title="Seen at the kunda"
              description="Each segment is one set of photographs, gathered around a place, a season, or an observance."
              href="/gallery"
              linkLabel="All segments"
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {home.gallery.slice(0, 6).map((segment, index) => (
                <GalleryCard key={segment.id} segment={segment} priority={index < 3} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Videos */}
      {home.latestVideos.length ? (
        <section className="container-page py-16 md:py-20">
          <SectionHeading eyebrow="Watch" title="Latest recordings" href="/videos" linkLabel="All videos" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {home.latestVideos.slice(0, 6).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}

      {/* A closing note, not a call to action. Two paragraphs of plain fact and
          the two links a reader actually needs, on the page's own ground. */}
      <section className="border-t border-line">
        <div className="container-page grid gap-8 py-14 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4">
            <h2 className="eyebrow">About this archive</h2>
          </div>
          <div className="md:col-span-8">
            <p className="max-w-2xl font-serif text-lg leading-relaxed text-ink">
              We publish what can be checked and keep what has been published. Papers carry their
              DOIs and their sources; photographs carry the date and the place they were made.
              Corrections are welcome and are recorded rather than quietly applied.
            </p>
            <p className="mt-6 text-sm text-ink-soft">
              Last updated {formatDate(home.recentUpdates[0]?.publishedAt ?? null) || "recently"}.{" "}
              <Link href="/about" className="link-rule">
                About the project
              </Link>{" "}
              <span aria-hidden className="mx-1 text-ink-muted">
                ·
              </span>
              <Link href="/contact" className="link-rule">
                Get in touch
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
