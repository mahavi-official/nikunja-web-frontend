import { EmptyState, Pagination } from "@/components/ui/primitives";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { IssueRow, LatestIssue, NEWSLETTER_NAME, NEWSLETTER_PITCH } from "@/components/newsletter";
import { listNewsletterIssues } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";

// Listings: one minute of staleness at worst.
export const revalidate = 60;

const PER_PAGE = 12;

type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { meta } = await listNewsletterIssues({ page, limit: PER_PAGE });

  return buildPageMetadata({
    title: page > 1 ? `Newsletter — page ${page}` : "Newsletter",
    description: NEWSLETTER_PITCH,
    path: page > 1 ? `/newsletter?page=${page}` : "/newsletter",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function NewsletterPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { issues, meta } = await listNewsletterIssues({ page, limit: PER_PAGE });

  // The first page leads with the newest issue; later pages are archive only.
  const [latest, ...rest] = page === 1 ? issues : [undefined, ...issues];

  return (
    <>
      {/* Masthead: what it is and the one thing to do about it. */}
      <section className="border-b border-line bg-surface-raised">
        <div className="container-page py-14 text-center md:py-20">
          <span className="eyebrow">Newsletter</span>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl leading-[1.1] md:text-6xl">{NEWSLETTER_NAME}</h1>
          <p className="mx-auto mt-5 max-w-xl font-serif text-lg leading-relaxed text-ink-soft md:text-xl">
            {NEWSLETTER_PITCH}
          </p>
          <div className="mx-auto mt-8 max-w-lg text-left">
            <NewsletterForm tone="default" buttonLabel="Subscribe" />
          </div>
          <p className="mt-3 text-xs text-ink-muted">Free. Unsubscribe from any email in one click.</p>
        </div>
      </section>

      <div className="container-page py-14 md:py-16">
        {issues.length === 0 ? (
          <EmptyState
            title={page > 1 ? "No issues on this page" : "The first issue is on its way"}
            description={
              page > 1
                ? "The archive is shorter than that."
                : "Subscribe above and it will arrive in your inbox the day it is published."
            }
            action={page > 1 ? { href: "/newsletter", label: "Back to the newsletter" } : undefined}
          />
        ) : (
          <>
            {latest ? <LatestIssue issue={latest} /> : null}

            {rest.length ? (
              <section className={latest ? "mt-16" : undefined}>
                <h2 className="eyebrow border-b border-line-strong pb-3">Archive</h2>
                <div className="divide-y divide-line">
                  {rest.map((issue) => (issue ? <IssueRow key={issue.id} issue={issue} /> : null))}
                </div>
              </section>
            ) : null}

            <Pagination page={page} totalPages={meta.totalPages} basePath="/newsletter" />
          </>
        )}
      </div>
    </>
  );
}
