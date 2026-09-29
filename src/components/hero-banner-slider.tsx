"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type BannerSlide = {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
};

const AUTO_ADVANCE_MS = 5000;

export function HeroBannerSlider({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative aspect-[16/7] w-full overflow-hidden rounded-xl sm:aspect-[21/8]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") goTo(index - 1);
        if (event.key === "ArrowRight") goTo(index + 1);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      tabIndex={0}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.imageUrl}
            alt={slide.title ?? ""}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          {(slide.title || slide.subtitle || slide.ctaLabel) && (
            <div className="absolute inset-0 flex items-center bg-black/30">
              <div className="max-w-md space-y-3 px-6 text-white sm:px-12">
                {slide.title && (
                  <h2 className="text-2xl font-semibold sm:text-4xl">{slide.title}</h2>
                )}
                {slide.subtitle && <p className="text-sm sm:text-base">{slide.subtitle}</p>}
                {slide.ctaLabel && slide.ctaLink && (
                  <Link
                    href={slide.ctaLink}
                    className="bg-background text-foreground inline-block rounded-lg px-5 py-2 text-sm font-medium"
                  >
                    {slide.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="absolute top-1/2 left-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i === index ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
