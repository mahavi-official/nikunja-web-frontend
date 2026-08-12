import { cn } from "@/lib/format";

/**
 * The mark reads as a kunda — still water in a ring of steps — with the sun
 * over it. Navy for the ring, orange for the sun: the two logo colours, doing
 * one job each.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden focusable="false">
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-[1.35rem] font-semibold tracking-tight",
            tone === "inverse" ? "text-white" : "text-ink"
          )}
        >
          Radha<span className="text-flame-500">kundah</span>
        </span>
        <span
          className={cn(
            "mt-1 text-[0.5625rem] font-semibold tracking-[0.22em] uppercase",
            tone === "inverse" ? "text-sand-300" : "text-ink-muted"
          )}
        >
          Research &amp; Tradition
        </span>
      </span>
    </span>
  );
}
