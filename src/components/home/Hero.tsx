"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 7000;

/**
 * Every slide is in the DOM and server-rendered — only opacity changes — so the
 * headline is crawlable and the LCP image is the first slide, loaded eagerly.
 * Auto-advance stops for `prefers-reduced-motion` and while the tab is hidden.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative isolate overflow-hidden bg-navy-950"
    >
      <div className="relative h-[clamp(30rem,72vh,44rem)]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            aria-hidden={slideIndex !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-out",
              slideIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <CoverImage
              media={slide.image}
              alt={slide.title}
              size="large"
              sizes="100vw"
              priority={slideIndex === 0}
              className={cn(
                "scale-105 transition-transform duration-[12s] ease-out",
                slideIndex === index && "scale-100"
              )}
            />
            <div
              className="absolute inset-0 bg-linear-to-r from-navy-950/92 via-navy-950/70 to-navy-950/25"
              aria-hidden
            />

            <div className="container-page relative flex h-full items-center">
              <div className="max-w-2xl py-16">
                <span className="eyebrow text-flame-400">Radhakundah</span>
                <h1 className="mt-4 text-4xl leading-[1.08] text-white md:text-6xl">
                  {slide.title}
                </h1>
                {slide.subtitle ? (
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-sand-200/85">
                    {slide.subtitle}
                  </p>
                ) : null}
                {slide.ctaUrl && slide.ctaLabel ? (
                  <Link
                    href={slide.ctaUrl}
                    className={buttonClass("primary", "lg", "mt-8 group")}
                    tabIndex={slideIndex === index ? 0 : -1}
                  >
                    {slide.ctaLabel}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 ? (
        <div className="container-page absolute inset-x-0 bottom-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Slide ${slideIndex + 1}: ${slide.title}`}
                onClick={() => go(slideIndex)}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  slideIndex === index ? "w-10 bg-flame-500" : "w-5 bg-white/35 hover:bg-white/60"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="grid size-10 place-items-center rounded-full border border-white/20 text-white/80 backdrop-blur-sm transition-colors hover:border-flame-400 hover:text-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="grid size-10 place-items-center rounded-full border border-white/20 text-white/80 backdrop-blur-sm transition-colors hover:border-flame-400 hover:text-white"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Shown when no hero slides are configured yet, so the page is never bare. */
export function StaticHero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 15% -10%, rgba(242,112,27,0.28), transparent 60%), radial-gradient(50rem 26rem at 90% 110%, rgba(39,74,124,0.55), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="container-page relative py-28 md:py-36">
        <span className="eyebrow text-flame-400">Nikunja Seva</span>
        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] text-white md:text-6xl">
          Scholarship and living tradition, gathered around Radha Kunda
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-200/80">
          Peer-reviewed research, long-form articles, photography, and recorded talks — published
          openly and kept in one place.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/research" className={buttonClass("primary", "lg", "group")}>
            Browse research
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link href="/about" className={buttonClass("inverse", "lg")}>
            About the project
          </Link>
        </div>
      </div>
    </section>
  );
}
