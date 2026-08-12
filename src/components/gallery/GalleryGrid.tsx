"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn, mediaUrl } from "@/lib/format";
import type { GalleryImage } from "@/lib/types";

/**
 * A masonry-ish grid with a keyboard-navigable lightbox.
 *
 * Every thumbnail is a real `next/image` with its required alt text (the CMS
 * enforces alt at upload, for accessibility and image SEO), so the grid is
 * meaningful with JavaScript disabled — the lightbox is the enhancement.
 */
export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + images.length) % images.length
      ),
    [images.length]
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex, close, move]);

  const active = openIndex === null ? null : images[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image: ${image.alt}`}
              className={cn(
                "group relative block w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken",
                // A gentle rhythm so the grid does not read as a spreadsheet.
                index % 7 === 0 ? "aspect-4/5" : "aspect-square"
              )}
            >
              <Image
                src={mediaUrl(image.media, "medium") ?? image.media.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                priority={index < 4}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {image.caption ? (
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy-950/85 to-transparent p-3 text-left text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {image.caption}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-90 flex flex-col bg-navy-950/96 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-sand-300/70 tabular-nums">
              {(openIndex ?? 0) + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-10 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-flame-400"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              src={mediaUrl(active.media, "large") ?? active.media.url}
              alt={active.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous image"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-flame-400"
            >
              <ChevronLeft className="size-5" />
            </button>

            <p className="min-w-0 flex-1 text-center text-sm text-sand-200/85">
              {active.caption || active.alt}
            </p>

            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next image"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-flame-400"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
