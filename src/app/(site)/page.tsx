import Link from "next/link";
import { ArrowRight, FileText, Images, PlayCircle, Sparkles } from "lucide-react";
import { Hero, StaticHero } from "@/components/home/Hero";
import { GalleryCard, PostCard, PullQuote, ResearchCard, VideoCard } from "@/components/cards";
import { ButtonLink, SectionHeading } from "@/components/ui/primitives";
import { getHome, getSettings } from "@/lib/api";
import { buildPageMetadata, SITE_TAGLINE } from "@/lib/seo";
import { formatDate, isoDate } from "@/lib/format";

// Listings: one minute of staleness at worst.
export const revalidate = 60;

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

const UPDATE_ICON = {
  post: FileText,
  research: Sparkles,
  video: PlayCircle,
} as const;

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

      {/* Standing statement — orients a first-time visitor in one screen. */}
      <section className="border-b border-line bg-surface-raised">
        <div className="container-page grid gap-8 py-14 md:grid-cols-3">
          {[
            {
              Icon: FileText,
              title: "Peer research, openly held",
              body: "Publications with full academic metadata, DOIs, and their papers attached.",
              href: "/research",
              label: "Read research",
            },
            {
              Icon: Images,
              title: "A visual record",
              body: "Photographic segments documenting the place, its seasons, and its observances.",
              href: "/gallery",
              label: "See the gallery",
            },
            {
              Icon: PlayCircle,
              title: "Talks and recordings",
              body: "Lectures, kirtan, and documentary footage, catalogued and searchable.",
              href: "/videos",
              label: "Watch videos",
            },
          ].map(({ Icon, title, body, href, label }) => (
            <div key={title} className="group">
              <span className="grid size-11 place-items-center rounded-xl bg-flame-50 text-flame-600 dark:bg-flame-900/30 dark:text-flame-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              <Link
                href={href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-600 transition-colors hover:text-flame-600 dark:text-navy-200"
              >
                {label}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {!hasContent ? (
        <section className="container-page py-24 text-center">
          <h2 className="text-2xl">The library is being prepared</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            Published research, articles, and media will appear here as the editorial team releases
            them.
          </p>
          <ButtonLink href="/about" variant="secondary" className="mt-8">
            About this project
          </ButtonLink>
        </section>
      ) : null}

      {/* Featured research */}
      {home.featuredResearch.length ? (
        <section className="container-page py-18 md:py-24">
          <SectionHeading
            eyebrow="Publications"
            title="Featured research"
            description="Papers selected by the editors, with abstracts open to everyone and full texts available to signed-in readers."
            href="/research"
            linkLabel="All research"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {home.featuredResearch.map((item) => (
              <ResearchCard key={item.id} research={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured articles */}
      {home.featuredPosts.length ? (
        <section className="border-y border-line bg-surface-raised py-18 md:py-24">
          <div className="container-page">
            <SectionHeading
              eyebrow="Writing"
              title="Featured articles"
              href="/articles"
              linkLabel="All articles"
            />
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <PostCard post={home.featuredPosts[0]} size="feature" priority />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
                {home.featuredPosts.slice(1, 4).map((post) => (
                  <PostCard key={post.id} post={post} size="compact" />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Blogs + recent updates */}
      {home.latestBlogs.length || home.recentUpdates.length ? (
        <section className="container-page grid gap-12 py-18 md:py-24 lg:grid-cols-12">
          {home.latestBlogs.length ? (
            <div className="lg:col-span-8">
              <SectionHeading eyebrow="Journal" title="Latest from the blog" href="/blogs" />
              <div className="grid gap-5 sm:grid-cols-2">
                {home.latestBlogs.map((post) => (
                  <PostCard key={post.id} post={post} href={`/blogs/${post.slug}`} />
                ))}
              </div>
            </div>
          ) : null}

          {home.recentUpdates.length ? (
            <aside className="lg:col-span-4">
              <h2 className="text-lg">Recent updates</h2>
              <span className="mt-3 block h-px w-full bg-line" />
              <ul className="mt-5 space-y-5">
                {home.recentUpdates.slice(0, 8).map((update) => {
                  const Icon = UPDATE_ICON[update.type];
                  return (
                    <li key={`${update.type}-${update.slug}`} className="group flex gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink-muted">
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`${UPDATE_PATH[update.type]}/${update.slug}`}
                          className="text-sm leading-snug font-medium transition-colors group-hover:text-flame-600"
                        >
                          {update.title}
                        </Link>
                        <time
                          dateTime={isoDate(update.publishedAt)}
                          className="mt-1 block text-xs text-ink-muted"
                        >
                          {formatDate(update.publishedAt)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          ) : null}
        </section>
      ) : null}

      {/* Gallery */}
      {home.gallery.length ? (
        <section className="border-t border-line bg-surface-raised py-18 md:py-24">
          <div className="container-page">
            <SectionHeading
              eyebrow="Gallery"
              title="Seen at the kunda"
              description="Photographic segments, each one a set gathered around a place, a season, or an observance."
              href="/gallery"
              linkLabel="All segments"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {home.gallery.slice(0, 6).map((segment, index) => (
                <GalleryCard key={segment.id} segment={segment} priority={index < 3} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Videos */}
      {home.latestVideos.length ? (
        <section className="container-page py-18 md:py-24">
          <SectionHeading eyebrow="Watch" title="Latest videos" href="/videos" linkLabel="All videos" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {home.latestVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Closing call to action */}
      <section className="relative isolate overflow-hidden bg-navy-900">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(40rem 22rem at 80% 0%, rgba(242,112,27,0.22), transparent 65%)",
          }}
          aria-hidden
        />
        <div className="container-page relative py-20 text-center">
          <div className="text-sand-100">
            <PullQuote
              text="What is written down is kept; what is kept is studied; what is studied is carried forward."
              attribution="Editorial principle"
            />
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/research" variant="primary" size="lg">
              Explore the research
            </ButtonLink>
            <ButtonLink href="/contact" variant="inverse" size="lg">
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
