"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { MandalaStage } from "./MandalaStage";
import { CoverImage } from "@/components/ui/CoverImage";
import { buttonClass } from "@/components/ui/primitives";
import { cn } from "@/lib/format";
import type { HeroSlide } from "@/lib/types";

const INTERVAL_MS = 8000;

/** The white ground, the light, and the faint mandala geometry behind it all. */
function HeroGround({ slides, index }: { slides: HeroSlide[]; index: number }) {
  return (
    <>
      {/* The slide photograph, washed almost to white. It sets a mood and a
          colour cast; it is never asked to carry contrast for the text. */}
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
            className="opacity-[0.14] saturate-[0.85] dark:opacity-[0.2]"
          />
        </div>
      ))}

      {/* Wash it back to the page colour, heaviest on the text side. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-surface via-surface/92 to-surface/55"
      />

      {/* Two soft lights: saffron behind the mandala, deep blue low and left. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(38rem 30rem at 78% 38%, rgba(247,125,18,0.16), transparent 62%), radial-gradient(34rem 26rem at 8% 96%, rgba(42,68,145,0.12), transparent 60%)",
        }}
      />

      {/* The mandala as texture, centred on where the real one hangs. */}
      <div
        aria-hidden
        className="mandala-field absolute inset-y-0 right-0 hidden w-[62%] text-navy-700 lg:block"
      />
    </>
  );
}

/**
 * The homepage hero.
 *
 * Two columns on a white ground: the slide's words on the left, the mandala on
 * the right. Only the active slide's text is rendered — a carousel that emits
 * five `h1`s into the document is a carousel that has misunderstood its job —
 * and the server always renders slide zero, so the crawler sees a real headline.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /**
   * The slide whose words are currently on screen. It lags `index` by the
   * length of the fade-out, so the text is swapped while it is invisible and
   * the headline is never caught mid-change. A keyed enter animation would be
   * shorter code and would leave the `h1` blank every time a slide advanced.
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

      <div className="container-page relative grid items-center gap-10 py-16 lg:min-h-[42rem] lg:grid-cols-12 lg:gap-6 lg:py-20">
        {/* ── words ── */}
        <div className="lg:col-span-6 xl:col-span-6">
          <span className="devanagari block text-sm font-semibold tracking-[0.3em] text-gold-600 dark:text-gold-400">
            ॥ राधाकुण्ड ॥
          </span>

          <div
            className={cn(
              "transition-opacity duration-500 ease-out",
              textVisible ? "opacity-100" : "opacity-0"
            )}
          >
            <h1 className="mt-4 text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.03] font-semibold text-navy-900 dark:text-white">
              {slide.title}
            </h1>

            {slide.subtitle ? (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                {slide.subtitle}
              </p>
            ) : null}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {slide.ctaUrl && slide.ctaLabel ? (
              <Link href={slide.ctaUrl} className={buttonClass("primary", "lg", "group")}>
                {slide.ctaLabel}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            ) : null}
            <Link href="/research" className={buttonClass("secondary", "lg")}>
              Browse the research
            </Link>
          </div>

          {count > 1 ? (
            <div className="mt-12 flex items-center gap-5">
              <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
                {slides.map((item, slideIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={slideIndex === index}
                    aria-label={`Slide ${slideIndex + 1}: ${item.title}`}
                    onClick={() => go(slideIndex)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      slideIndex === index
                        ? "w-10 bg-flame-500"
                        : "w-4 bg-line-strong hover:bg-flame-300"
                    )}
                  />
                ))}
              </div>

              <span className="h-5 w-px bg-line" aria-hidden />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous slide"
                  className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-flame-400 hover:text-flame-600"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next slide"
                  className="grid size-9 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-flame-400 hover:text-flame-600"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── the mandala ── */}
        <div className="relative lg:col-span-6 xl:col-span-6">
          <MandalaStage className="mx-auto aspect-square w-full max-w-[34rem]" />
        </div>
      </div>
    </section>
  );
}

/** Shown when no hero slides are configured yet, so the page is never bare. */
export function StaticHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-surface">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(38rem 30rem at 78% 38%, rgba(247,125,18,0.16), transparent 62%), radial-gradient(34rem 26rem at 8% 96%, rgba(42,68,145,0.12), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="mandala-field absolute inset-y-0 right-0 hidden w-[62%] text-navy-700 lg:block"
      />

      <div className="container-page relative grid items-center gap-10 py-16 lg:min-h-[42rem] lg:grid-cols-12 lg:gap-6 lg:py-20">
        <div className="lg:col-span-6">
          <span className="devanagari block text-sm font-semibold tracking-[0.3em] text-gold-600 dark:text-gold-400">
            ॥ राधाकुण्ड ॥
          </span>
          <h1 className="mt-4 text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.03] font-semibold text-navy-900 dark:text-white">
            Scholarship and living tradition, gathered around Radha Kunda
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Peer-reviewed research, long-form articles, photography, and recorded talks — published
            openly and kept in one place.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/research" className={buttonClass("primary", "lg", "group")}>
              Browse research
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link href="/about" className={buttonClass("secondary", "lg")}>
              About the project
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <MandalaStage className="mx-auto aspect-square w-full max-w-[34rem]" />
        </div>
      </div>
    </section>
  );
}
