import { getVideoCategories, listVideos } from "@/lib/api";
import { buildPageMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ListingShell } from "@/components/listing/ListingShell";
import { VideoCard } from "@/components/cards";
import { EmptyState, JsonLd, Pagination } from "@/components/ui/primitives";

export const revalidate = 60;

type SearchParams = Promise<{ page?: string; category?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const { meta } = await listVideos({ page, category: params.category });

  return buildPageMetadata({
    title: page > 1 ? `Videos — page ${page}` : "Videos",
    description: "Recorded lectures, kirtan, and documentary footage, catalogued and searchable.",
    path: page > 1 ? `/videos?page=${page}` : "/videos",
    pagination: { page, totalPages: meta.totalPages },
  });
}

export default async function VideosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);

  const [{ videos, meta }, categories] = await Promise.all([
    listVideos({ page, category: params.category }),
    getVideoCategories(),
  ]);

  const trail = [
    { name: "Home", url: "/" },
    { name: "Videos", url: "/videos" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />

      <ListingShell
        eyebrow="Watch"
        title="Videos"
        description="Talks, kirtan, and documentary footage. Every video has its own page, so each one can be found and shared on its own."
        breadcrumbs={trail}
        total={meta.total}
        filters={{
          label: "Category",
          allHref: "/videos",
          activeSlug: params.category,
          options: categories.map((category) => ({
            slug: category.slug,
            name: category.name,
            href: `/videos?category=${category.slug}`,
          })),
        }}
      >
        {videos.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} priority={index < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No videos in this view"
            description="Try another category, or browse the whole collection."
            action={{ href: "/videos", label: "All videos" }}
          />
        )}

        <Pagination
          page={page}
          totalPages={meta.totalPages}
          basePath="/videos"
          searchParams={{ category: params.category }}
        />
      </ListingShell>
    </>
  );
}
