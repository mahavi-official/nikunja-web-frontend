import { ApiError, getGallerySegment, listGallery } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { Breadcrumbs, EmptyState, JsonLd, SectionHeading } from "@/components/ui/primitives";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryCard } from "@/components/cards";

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { segments } = await listGallery(1, 50);
  return segments.map((segment) => ({ slug: segment.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { seo } = await getGallerySegment(slug);
    return metadataFromSeo(seo);
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function GallerySegmentPage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getGallerySegment(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/gallery/${slug}`);
    }
    throw error;
  }

  const { segment, seo } = data;
  const images = segment.images ?? [];

  const { segments } = await listGallery(1, 7);
  const others = segments.filter((item) => item.id !== segment.id).slice(0, 3);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Gallery", url: "/gallery" },
    { name: segment.name, url: `/gallery/${segment.slug}` },
  ];

  return (
    <>
      <JsonLd data={seo.jsonLd} />

      <header className="border-b border-line bg-surface-raised">
        <div className="container-page py-10 md:py-14">
          <Breadcrumbs trail={trail} />
          <span className="eyebrow">Gallery segment</span>
          <h1 className="mt-2 text-3xl md:text-5xl">{segment.name}</h1>
          {segment.description ? (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {segment.description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-ink-muted">
            {images.length} image{images.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <section className="container-page py-10 md:py-14">
        {images.length ? (
          <GalleryGrid images={images} />
        ) : (
          <EmptyState
            title="This segment is empty"
            description="No images have been added to it yet."
            action={{ href: "/gallery", label: "All segments" }}
          />
        )}
      </section>

      {others.length ? (
        <section className="border-t border-line bg-surface-raised py-16">
          <div className="container-page">
            <SectionHeading eyebrow="Continue" title="Other segments" href="/gallery" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <GalleryCard key={item.id} segment={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
