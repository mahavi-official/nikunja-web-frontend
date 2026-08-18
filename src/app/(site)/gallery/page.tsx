import { listGallery } from "@/lib/api";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ListingShell } from "@/components/listing/ListingShell";
import { GalleryCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";

export const revalidate = 60;

type SearchParams = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { meta } = await listGallery(page);

  return buildPageMetadata({
    title: page > 1 ? `Gallery — page ${page}` : "Gallery",
    description:
      "Photographic segments documenting Radha Kunda — its seasons, its observances, and the people who keep it.",
    path: page > 1 ? `/gallery?page=${page}` : "/gallery",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function GalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const page = pageNumber((await searchParams).page);
  const { segments, meta } = await listGallery(page);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Gallery", url: "/gallery" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow="Photography"
        title="Gallery"
        description="Each segment gathers a set of photographs around one place, season, or observance."
        breadcrumbs={trail}
        total={meta.total}
      >
        {segments.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment, index) => (
              <GalleryCard key={segment.id} segment={segment} priority={index < 3} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No segments published yet"
            description="Photographic segments appear here as they are curated."
            action={{ href: "/", label: "Back home" }}
          />
        )}

        <Pagination page={page} totalPages={meta.totalPages} basePath="/gallery" />
      </ListingShell>
    </>
  );
}
