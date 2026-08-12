"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayCircle } from "lucide-react";

/**
 * A facade: we show the thumbnail and only load YouTube's iframe once the
 * reader actually presses play. Embedding it eagerly costs roughly a megabyte
 * of third-party JavaScript and sets cookies on a page nobody asked to watch.
 * `youtube-nocookie` keeps the privacy posture once they do.
 */
export function YouTubeEmbed({
  youtubeId,
  title,
  thumbnailUrl,
}: {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-navy-950">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 size-full"
        >
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 60rem, 100vw"
            priority
            className="object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center bg-navy-950/25 transition-colors group-hover:bg-navy-950/10">
            <PlayCircle className="size-20 text-white drop-shadow-xl transition-transform duration-300 group-hover:scale-105" />
          </span>
        </button>
      )}
    </div>
  );
}
