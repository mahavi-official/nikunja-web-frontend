import { cn } from "@/lib/format";

/**
 * The mark reads as a kunda — still water in a ring of steps — with the sun
 * over it. Navy for the ring, orange for the sun: the two logo colours, doing
 * one job each.
 */
/* The size is a default rather than a merged-in base class: `cn` only joins,
   so a `size-*` passed by a caller would lose to a hardcoded one here on
   stylesheet order rather than on the order the two are written. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      {/* Lifted a step in dark mode so the ring does not sink into the page. */}
      <circle cx="20" cy="20" r="19" className="fill-navy-900 dark:fill-navy-700" />
      <circle cx="20" cy="16.5" r="5.25" className="fill-flame-500" />
      <path
        d="M7 25.5h26M9.5 29.5h21M13 33.5h14"
        className="stroke-sand-100"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M20 27.5c-4.5 0-7.5-2.6-7.5-2.6"
        className="stroke-flame-400"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    /* The strap under the name is set wide, which makes the lockup the widest
       thing in the masthead. On a narrow phone both lines come down a step so
       the header still fits beside the controls rather than pushing the page
       sideways. */
    <span className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0 sm:size-9" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-[1.05rem] font-semibold tracking-tight min-[360px]:text-[1.2rem] sm:text-[1.35rem]",
            tone === "inverse" ? "text-white" : "text-ink"
          )}
        >
          Radha<span className="text-flame-500">kundah</span>
        </span>
        <span
          className={cn(
            // Below 360px there is no room for it beside the controls, and a
            // strap is the one part of the lockup that can go.
            "mt-1 hidden text-[0.5rem] font-semibold tracking-[0.14em] uppercase min-[360px]:block sm:text-[0.5625rem] sm:tracking-[0.22em]",
            tone === "inverse" ? "text-sand-300" : "text-ink-muted"
          )}
        >
          Research &amp; Tradition
        </span>
      </span>
    </span>
  );
}
