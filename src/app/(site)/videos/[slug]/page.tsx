import Link from "next/link";
import { Eye } from "lucide-react";
import { ApiError, getVideo, listVideos } from "@/lib/api";
import { metadataFromSeo } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/navigation";
import { formatCount, formatDate, formatDuration, isoDate } from "@/lib/format";
import { Badge, Breadcrumbs, JsonLd } from "@/components/ui/primitives";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";
import { VideoCard } from "@/components/cards";
import { ShareRow } from "@/components/post/ShareRow";
import { ViewCounter } from "@/components/post/ViewCounter";

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const { videos } = await listVideos({ limit: 50 });
  return videos.map((video) => ({ slug: video.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const { seo } = await getVideo(slug);
    return metadataFromSeo(seo);
  } catch {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
}

export default async function VideoPage({ params }: { params: Params }) {
  const { slug } = await params;

  let data;
  try {
    data = await getVideo(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      await redirectOrNotFound(`/videos/${slug}`);
    }
    throw error;
  }

  const { video, seo } = data;
  const related = await listVideos({ category: video.category?.slug, limit: 5 });

  const trail = [
    { name: "Home", url: "/" },
    { name: "Videos", url: "/videos" },
    { name: video.title, url: `/videos/${video.slug}` },
  ];

  return (
    <>
      {/* VideoObject structured data comes ready-built from the API. */}
      <JsonLd data={seo.jsonLd} />
      <ViewCounter kind="videos" slug={video.slug} />

      <div className="container-page py-8 md:py-12">
        <Breadcrumbs trail={trail} />

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <YouTubeEmbed
              youtubeId={video.youtubeId}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
            />

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {video.category ? (
                <Link href={`/videos?category=${video.category.slug}`}>
                  <Badge tone="flame">{video.category.name}</Badge>
                </Link>
              ) : null}
              {video.durationSec ? (
                <Badge tone="muted">{formatDuration(video.durationSec)}</Badge>
              ) : null}
            </div>

            <h1 className="mt-4 text-2xl leading-snug md:text-4xl">{video.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              <time dateTime={isoDate(video.publishedAt)}>{formatDate(video.publishedAt)}</time>
              {video.viewCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" aria-hidden />
                  {formatCount(video.viewCount)} views
                </span>
              ) : null}
            </div>

            {video.description ? (
              <p className="mt-6 leading-relaxed whitespace-pre-line text-ink-soft">
                {video.description}
              </p>
            ) : null}

            <div className="mt-8 border-t border-line pt-6">
              <ShareRow url={seo.canonical} title={video.title} />
            </div>
          </div>

          <aside className="lg:col-span-4">
            <h2 className="text-lg">Up next</h2>
            <ul className="mt-5 space-y-5">
              {related.videos
                .filter((item) => item.id !== video.id)
                .slice(0, 4)
                .map((item) => (
                  <li key={item.id}>
                    <VideoCard video={item} />
                  </li>
                ))}
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
