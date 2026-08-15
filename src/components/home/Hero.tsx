"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MandalaStage } from "./MandalaStage";
import { CoverImage } from "@/components/ui/CoverImage";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 8000;

/** The ground behind the hero: the slide photograph, washed back to the page.
 *
 *  The two coloured radial glows that used to sit over this are gone — they
 *  were lighting nothing. What remains is the photograph itself, held well
 *  under the text so it sets a colour cast and never competes with the type
 *  or with the mandala. */
function HeroGround({ slides, index }: { slides: HeroSlide[]; index: number }) {
  return (
    <>
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.id}
          aria-hidden
          className={cn(
            "absolute inset-0 transition-opacity duration-[1400ms] ease-out",
            slideIndex === index ? "opacity-100" : "opacity-0"
          )}
        >
          <CoverImage
            media={slide.image}
            alt=""
            size="large"
            sizes="100vw"
            priority={slideIndex === 0}
            className="opacity-[0.13] saturate-[0.85] dark:opacity-[0.18]"
          />
        </div>
      ))}

      {/* Wash it back to the page colour, heaviest on the text side. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-surface via-surface/92 to-surface/55"
      />

      {/* The mandala as texture, centred on where the real one hangs. */}
      <div
        aria-hidden
        className="mandala-field absolute inset-y-0 right-0 hidden w-[62%] text-navy-700 lg:block dark:text-navy-300"
      />
    </>
  );
}

/**
 * The homepage hero: the slide's words on the left, the mandala on the right,
 * set in the same editorial voice as the rest of the page.
 *
 * Only the active slide's text is rendered — a carousel that emits five `h1`s
 * into the document is a carousel that has misunderstood its job — and the
 * server always renders slide zero, so the crawler sees a real headline.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /**
   * The slide whose words are currently on screen. It lags `index` by the
   * length of the fade-out, so the text is swapped while it is invisible and
   * the headline is never caught mid-change.
   */
  const [shown, setShown] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
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

  useEffect(() => {
    if (shown === index) return;
    setTextVisible(false);
    const timer = window.setTimeout(() => {
      setShown(index);
      setTextVisible(true);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [index, shown]);

  if (!count) return null;

  const slide = slides[Math.min(shown, count - 1)];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative isolate overflow-hidden border-b border-line bg-surface"
    >
      <HeroGround slides={slides} index={index} />

      <div className="container-page relative grid items-center gap-12 py-12 lg:min-h-[42rem] lg:grid-cols-12 lg:gap-16 lg:py-20">
        {/* ── words ── */}
        <div className="lg:col-span-6">
          <span className="devanagari block text-sm font-semibold tracking-[0.3em] text-gold-600 dark:text-gold-400">
            ॥ राधाकुण्ड ॥
          </span>

          <div
            className={cn(
              "transition-opacity duration-500 ease-out",
              textVisible ? "opacity-100" : "opacity-0"
            )}
          >
            <h1 className="mt-5 text-[clamp(2.5rem,5vw,4rem)] leading-[1.06] font-semibold text-navy-900 dark:text-white">
              {slide.title}
            </h1>

            {slide.subtitle ? (
              <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-ink-soft">
                {slide.subtitle}
              </p>
            ) : null}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            {slide.ctaUrl && slide.ctaLabel ? (
              <Link href={slide.ctaUrl} className={buttonClass("primary", "lg")}>
                {slide.ctaLabel}
              </Link>
            ) : null}
            <Link href="/research" className="link-rule text-[0.9375rem] text-ink-soft">
              Browse the research
            </Link>
          </div>

          {count > 1 ? (
            <div className="mt-12 flex items-center gap-4 border-t border-line pt-5">
              {/* Slides are numbered, the way plates in a book are numbered.
                  A row of coloured dashes tells a reader nothing about where
                  they are or how far the set runs. */}
              <div className="flex items-center gap-3" role="tablist" aria-label="Choose slide">
                {slides.map((item, slideIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={slideIndex === index}
                    aria-label={`Slide ${slideIndex + 1}: ${item.title}`}
                    onClick={() => go(slideIndex)}
                    className={cn(
                      "text-sm tabular-nums transition-colors",
                      slideIndex === index
                        ? "font-semibold text-ink underline underline-offset-[0.35em]"
                        : "text-ink-muted hover:text-flame-700"
                    )}
                  >
                    {String(slideIndex + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>

              <span className="h-4 w-px bg-line-strong" aria-hidden />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous slide"
                  className="grid size-8 place-items-center text-ink-muted transition-colors hover:text-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next slide"
                  className="grid size-8 place-items-center text-ink-muted transition-colors hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── the mandala ── */}
        <div className="relative lg:col-span-6">
          <MandalaStage className="mx-auto aspect-square w-full max-w-[34rem]" />
        </div>
      </div>
    </section>
  );
}

/**
 * Shown when no hero slides are configured yet. With no photograph to print,
 * the mandala takes the plate — it is the one piece of ornament the site owns
 * outright, and this is the page that has room for it.
 */
export function StaticHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-surface">
      <div
        aria-hidden
        className="mandala-field absolute inset-y-0 right-0 hidden w-[55%] text-navy-700 lg:block dark:text-navy-300"
      />

      <div className="container-page relative grid items-center gap-12 py-12 lg:grid-cols-12 lg:gap-16 lg:py-20">
        <div className="lg:col-span-6">
          <span className="devanagari block text-sm font-semibold tracking-[0.3em] text-gold-600 dark:text-gold-400">
            ॥ राधाकुण्ड ॥
          </span>
          <h1 className="mt-5 text-[clamp(2.5rem,5vw,4rem)] leading-[1.06] font-semibold text-navy-900 dark:text-white">
            Scholarship and living tradition, gathered around Radha Kunda
          </h1>
          <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-ink-soft">
            Peer-reviewed research, long-form articles, photography, and recorded talks, published
            openly and kept in one place.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link href="/research" className={buttonClass("primary", "lg")}>
              Browse research
            </Link>
            <Link href="/about" className="link-rule text-[0.9375rem] text-ink-soft">
              About the project
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <MandalaStage className="mx-auto aspect-square w-full max-w-[32rem]" />
        </div>
      </div>
    </section>
  );
}
