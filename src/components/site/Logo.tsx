import Image from "next/image";

import { cn } from "@/lib/format";

/**
 * The brand mark, served as a raster tile. The source file sits on its own
 * opaque black ground; `logo-mark-alpha` (defined once in the root layout)
 * keys that black out to transparent at render time, so the mark drops onto
 * the page without a dark square around it.
 */
/* The size is a default rather than a merged-in base class: `cn` only joins,
   so a `size-*` passed by a caller would lose to a hardcoded one here on
   stylesheet order rather than on the order the two are written. */
export function LogoMark({
  className = "size-9",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/radhakunda_logo.jpeg"
      alt=""
      aria-hidden
      width={1280}
      height={1280}
      priority={priority}
      style={{ filter: "url(#logo-mark-alpha)" }}
      /* The intrinsic size above is only the aspect hint for the optimiser;
         the `size-*` class is what actually lays the mark out. */
      className={cn("object-contain", className)}
    />
  );
}

export function Logo({
  className,
  tone = "default",
  priority = false,
}: {
  className?: string;
  tone?: "default" | "inverse";
  priority?: boolean;
}) {
  return (
    /* The strap under the name is set wide, which makes the lockup the widest
       thing in the masthead. On a narrow phone both lines come down a step so
       the header still fits beside the controls rather than pushing the page
       sideways. */
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0 sm:size-9" priority={priority} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-[1.05rem] font-semibold tracking-tight min-[360px]:text-[1.2rem] sm:text-[1.35rem]",
            tone === "inverse" ? "text-white" : "text-ink"
          )}
        >
          Radha<span className="text-[#ef9f00]">kundah</span>
        </span>
        <span
          className={cn(
            // Below 360px there is no room for it beside the controls, and a
            // strap is the one part of the lockup that can go.
            "mt-1 hidden text-[0.5rem] font-semibold tracking-[0.14em] uppercase min-[360px]:block sm:text-[0.5625rem] sm:tracking-[0.22em]",
            tone === "inverse" ? "text-sand-300" : "text-ink-muted"
          )}
        >
          Research &amp; wisdom
        </span>
      </span>
    </span>
  );
}
