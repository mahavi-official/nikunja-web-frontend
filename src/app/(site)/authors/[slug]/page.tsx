import Link from "next/link";
import { Building2, Mail } from "lucide-react";
import { ApiError, getAuthor, listAuthors } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { formatDate, isoDate } from "@/lib/format";
import { Breadcrumbs, EmptyState, JsonLd } from "@/components/ui/primitives";
import { CoverImage } from "@/components/ui/CoverImage";

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { authors } = await listAuthors(1, 50);
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { seo } = await getAuthor(slug);
    return metadataFromSeo(seo);
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getAuthor(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/authors/${slug}`);
    }
    throw error;
  }

  const { author, seo } = data;
  const publications =
    author.research?.map((link) => link.research).filter((item) => item.status === "PUBLISHED") ?? [];

  const trail = [
    { name: "Home", url: "/" },
    { name: "Authors", url: "/authors" },
    { name: author.name, url: `/authors/${author.slug}` },
  ];

  return (
    <>
      <JsonLd data={seo.jsonLd} />

      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-10 md:py-14">
          <Breadcrumbs trail={trail} />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
              <CoverImage
                media={author.photo}
                alt={author.name}
                size="thumb"
                sizes="96px"
                priority
                fallbackLabel={author.name.charAt(0)}
              />
            </div>

            <div className="min-w-0">
              <span className="eyebrow">Author</span>
              <h1 className="mt-2 text-3xl md:text-4xl">{author.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                {author.affiliation ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-3.5" aria-hidden />
                    {author.affiliation}
                  </span>
                ) : null}
                {author.email ? (
                  <a
                    href={`mailto:${author.email}`}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-flame-600"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    {author.email}
                  </a>
                ) : null}
                {author.orcid ? (
                  <a
                    href={`https://orcid.org/${author.orcid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-flame-600"
                  >
                    ORCID {author.orcid}
                  </a>
                ) : null}
              </div>

              {author.bio ? (
                <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">{author.bio}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="container-page py-12">
        <h2 className="text-xl">Publications</h2>

        {publications.length ? (
          <ol className="mt-6 divide-y divide-[color:var(--border-subtle)]">
            {publications.map((item) => (
              <li key={item.id} className="group py-5">
                <Link href={`/research/${item.slug}`} className="block">
                  <h3 className="text-lg leading-snug transition-colors group-hover:text-flame-600">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
                    <time dateTime={isoDate(item.publishedAt)}>{formatDate(item.publishedAt)}</time>
                    {item.journal ? <span className="italic">{item.journal}</span> : null}
                    {item.publicationYear ? <span>{item.publicationYear}</span> : null}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {item.abstract}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No published work listed yet"
              description={`Publications by ${author.name} will appear here once released.`}
              action={{ href: "/research", label: "All research" }}
            />
          </div>
        )}
      </section>
    </>
  );
}
