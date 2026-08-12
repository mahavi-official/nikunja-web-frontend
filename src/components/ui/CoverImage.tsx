import Image from "next/image";
import { cn, mediaAlt, mediaUrl } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * Every cover image on the site goes through here, so three things stay true
 * everywhere: we render a pre-generated derivative rather than the original, a
 * missing image degrades to a branded placeholder instead of a broken box, and
 * `sizes` is always declared so the browser never over-downloads.
 */
export function CoverImage({
  media,
  alt,
  size = "medium",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className,
  fallbackLabel,
}: {
  media: Media | null | undefined;
  alt: string;
  size?: "thumb" | "medium" | "large" | "og";
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallbackLabel?: string;
}) {
  const url = mediaUrl(media, size);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-linear-to-br from-navy-800 to-navy-950",
          className
        )}
        aria-hidden
      >
        <span className="font-serif text-2xl text-flame-400/70 select-none">
          {fallbackLabel ?? "॥"}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={mediaAlt(media, alt)}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

/** Same contract, for a plain remote URL (YouTube thumbnails). */
export function RemoteImage({
  src,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
