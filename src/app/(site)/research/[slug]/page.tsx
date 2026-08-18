import Link from "next/link";
import { ApiError, getResearch, listResearch } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { Badge, Breadcrumbs, JsonLd, SectionHeading } from "@/components/ui/primitives";
import { CoverImage } from "@/components/ui/CoverImage";
import { ResearchCard } from "@/components/cards";
import { PaperAccess } from "@/components/research/PaperAccess";
import { ShareRow } from "@/components/post/ShareRow";

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const { research } = await listResearch({ limit: 50 });
    return research.map((item) => ({ slug: item.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { research, seo } = await getResearch(slug);
    return metadataFromSeo(seo, { keywords: research.keywords });
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

/** Academic metadata, rendered only for the fields that are actually filled in. */
function CitationRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="w-32 shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export default async function ResearchDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getResearch(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/research/${slug}`);
    }
    throw error;
  }

  const { research, seo } = data;

  const byline = research.authors?.slice().sort((a, b) => a.order - b.order) ?? [];
  const related = await listResearch({
    category: research.category?.slug,
    limit: 4,
  });

  const trail = [
    { name: "Home", url: "/" },
    { name: "Research", url: "/research" },
    { name: research.title, url: `/research/${research.slug}` },
  ];

  const citation = [
    byline.map((link) => link.author.name).join(", "),
    research.publicationYear ? `(${research.publicationYear})` : null,
    `${research.title}.`,
    research.journal,
    research.volume ? `${research.volume}${research.issue ? `(${research.issue})` : ""}` : null,
    research.pages,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <JsonLd data={seo.jsonLd} />

      <article>
        <header className="border-b border-line bg-surface-raised">
          <div className="container-page py-10 md:py-14">
            <Breadcrumbs trail={trail} />

            <div className="grid gap-10 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="navy">Research</Badge>
                  {research.category ? (
                    <Link href={`/research?category=${research.category.slug}`}>
                      <Badge tone="flame">{research.category.name}</Badge>
                    </Link>
                  ) : null}
                  {research.publicationYear ? (
                    <Badge tone="muted">{research.publicationYear}</Badge>
                  ) : null}
                </div>

                <h1 className="mt-4 text-3xl leading-[1.15] md:text-4xl">{research.title}</h1>

                {byline.length ? (
                  <p className="mt-5 text-[0.9375rem] text-ink-soft">
                    {byline.map((link, index) => (
                      <span key={link.authorId}>
                        <Link
                          href={`/authors/${link.author.slug}`}
                          className="font-medium transition-colors hover:text-flame-600"
                        >
                          {link.author.name}
                        </Link>
                        {link.isCorresponding ? (
                          <span title="Corresponding author" className="text-flame-600">
                            *
                          </span>
                        ) : null}
                        {index < byline.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                ) : null}

                <p className="mt-2 text-sm text-ink-muted">
                  <time dateTime={isoDate(research.publishedAt)}>
                    Published {formatDate(research.publishedAt)}
                  </time>
                </p>
              </div>

              {research.ogImage ? (
                <div className="min-w-0 lg:col-span-4">
                  <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
                    <CoverImage
                      media={research.ogImage}
                      alt={research.title}
                      size="medium"
                      sizes="(min-width: 1024px) 24rem, 100vw"
                      priority
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="container-page grid gap-12 py-10 md:py-14 lg:grid-cols-12">
          {/* `min-w-0` — a grid item's automatic minimum is its content, so a
              long filename or an unwrappable button in here would widen the
              track past the viewport instead of wrapping. */}
          <div className="min-w-0 lg:col-span-8">
            <h2 className="text-lg">Abstract</h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink-soft">
              {research.abstract}
            </p>

            {research.keywords?.length ? (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                  Keywords
                </span>
                {research.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-surface-sunken px-3 py-1 text-sm text-ink-soft"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}

            <PaperAccess slug={research.slug} files={research.files ?? []} title={research.title} />

            {research.tags?.length ? (
              <div className="mt-10 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                  Tags
                </span>
                {research.tags.map(({ tag }) => (
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
              <ShareRow url={seo.canonical} title={research.title} />
            </div>
          </div>

          {/* Citation rail */}
          <aside className="min-w-0 lg:col-span-4">
            <div className="sticky top-24 rounded-[var(--radius-card)] border border-line bg-surface-raised p-6">
              <h2 className="text-base">Publication details</h2>
              <dl className="mt-4">
                {research.journal ? (
                  <CitationRow label="Journal">{research.journal}</CitationRow>
                ) : null}
                {research.volume ? <CitationRow label="Volume">{research.volume}</CitationRow> : null}
                {research.issue ? <CitationRow label="Issue">{research.issue}</CitationRow> : null}
                {research.pages ? <CitationRow label="Pages">{research.pages}</CitationRow> : null}
                {research.publicationYear ? (
                  <CitationRow label="Year">{research.publicationYear}</CitationRow>
                ) : null}
                {research.doi ? (
                  <CitationRow label="DOI">
                    <a
                      href={`https://doi.org/${research.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-flame-700 underline underline-offset-2 dark:text-flame-300"
                    >
                      {research.doi}
                    </a>
                  </CitationRow>
                ) : null}
                <CitationRow label="Views">{research.viewCount}</CitationRow>
              </dl>

              {citation ? (
                <div className="mt-6 border-t border-line pt-4">
                  <p className="text-xs font-semibold tracking-wider text-ink-muted uppercase">
                    Cite this
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{citation}</p>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </article>

      {related.research.filter((item) => item.id !== research.id).length ? (
        <section className="border-t border-line bg-surface-raised py-16">
          <div className="container-page">
            <SectionHeading eyebrow="Also published" title="Related research" href="/research" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.research
                .filter((item) => item.id !== research.id)
                .slice(0, 3)
                .map((item) => (
                  <ResearchCard key={item.id} research={item} />
                ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
