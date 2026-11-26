import Link from "next/link";
import { Clock } from "lucide-react";
import { ApiError, getNewsletterIssue, listNewsletterIssues } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { Breadcrumbs, JsonLd } from "@/components/ui/primitives";
import { CoverImage } from "@/components/ui/CoverImage";
import { ShareRow } from "@/components/post/ShareRow";
import { SubscribeBox, issuePath } from "@/components/newsletter";
import { formatDate, isoDate, normalizeMediaHtml, readingTime } from "@/lib/format";

// Detail pages tolerate five minutes of staleness.
export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const { issues } = await listNewsletterIssues({ limit: 50 });
    return issues.map((issue) => ({ slug: issue.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { seo } = await getNewsletterIssue(slug);
    return metadataFromSeo(seo);
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function NewsletterIssuePage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getNewsletterIssue(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/newsletter/${slug}`);
    }
    throw error;
  }

  const { issue, newer, older, seo } = data;
  const trail = [
    { name: "Home", url: "/" },
    { name: "Newsletter", url: "/newsletter" },
    { name: issue.title, url: issuePath(issue) },
  ];

  return (
    <>
      <JsonLd data={seo.jsonLd} />

      <article>
        <header className="border-b border-line bg-surface-raised">
          <div className="container-page py-10 md:py-14">
            <Breadcrumbs trail={trail} />

            <div className="mx-auto max-w-3xl">
              <Link href="/newsletter" className="eyebrow hover:text-flame-700">
                Newsletter
              </Link>
              <h1 className="mt-4 text-3xl leading-[1.12] md:text-5xl">{issue.title}</h1>
              {issue.subtitle ? (
                <p className="mt-5 font-serif text-xl leading-relaxed text-ink-soft">{issue.subtitle}</p>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                <span className="font-medium text-ink-soft">{issue.author.name}</span>
                <time dateTime={isoDate(issue.publishedAt)}>{formatDate(issue.publishedAt)}</time>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  {readingTime(issue.content)} min read
                </span>
              </div>
            </div>
          </div>
        </header>

        {issue.coverImage ? (
          <div className="container-page py-8 md:py-10">
            <div className="relative mx-auto aspect-16/9 max-w-4xl overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
              <CoverImage
                media={issue.coverImage}
                alt={issue.title}
                size="large"
                sizes="(min-width: 1024px) 56rem, 100vw"
                priority
              />
            </div>
          </div>
        ) : null}

        <div className="container-page py-8 md:py-12">
          <div className="mx-auto max-w-3xl">
            {/* Sanitised server-side when the issue was saved. */}
            <div
              className="prose-content"
              dangerouslySetInnerHTML={{ __html: normalizeMediaHtml(issue.content) }}
            />

            <div className="mt-10 border-t border-line pt-6">
              <ShareRow url={seo.canonical} title={issue.title} />
            </div>

            <SubscribeBox className="mt-12" title="Get the next issue by email" />

            {newer || older ? (
              <nav aria-label="More issues" className="mt-12 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
                {older ? (
                  <Link href={issuePath(older)} className="group block">
                    <span className="text-xs tracking-wider text-ink-muted uppercase">Previous issue</span>
                    <span className="mt-1 block font-display text-lg leading-snug group-hover:text-flame-700">
                      {older.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {newer ? (
                  <Link href={issuePath(newer)} className="group block sm:text-right">
                    <span className="text-xs tracking-wider text-ink-muted uppercase">Next issue</span>
                    <span className="mt-1 block font-display text-lg leading-snug group-hover:text-flame-700">
                      {newer.title}
                    </span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}
