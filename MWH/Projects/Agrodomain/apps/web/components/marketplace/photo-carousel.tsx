"use client";

import { ChevronLeft, ChevronRight, MapPin, Sprout } from "lucide-react";
import React from "react";
import { useState } from "react";

type PhotoCarouselSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  accentClassName: string;
};

type PhotoCarouselProps = {
  commodity: string;
  location: string;
  slides: PhotoCarouselSlide[];
};

export function PhotoCarousel(props: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = props.slides[activeIndex] ?? props.slides[0];

  function showNext() {
    setActiveIndex((current) => (current + 1) % props.slides.length);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + props.slides.length) % props.slides.length);
  }

  return (
    <section className="market-carousel" aria-label="Listing visual highlights">
      <div className={["market-carousel-stage", activeSlide.accentClassName].join(" ")}>
        <div className="market-carousel-overlay" />
        <div className="market-carousel-copy">
          <span className="eyebrow">{activeSlide.eyebrow}</span>
          <h2>{activeSlide.title}</h2>
          <p>{activeSlide.body}</p>
          <div className="market-carousel-facts">
            <span>
              <Sprout size={16} />
              {props.commodity}
            </span>
            <span>
              <MapPin size={16} />
              {props.location}
            </span>
          </div>
        </div>
      </div>

      {props.slides.length > 1 ? (
        <div className="market-carousel-controls">
          <div className="market-carousel-nav">
            <button
              aria-label="Show previous listing visual"
              className="button-ghost market-carousel-button"
              onClick={showPrevious}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Show next listing visual"
              className="button-ghost market-carousel-button"
              onClick={showNext}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="market-carousel-dots" role="tablist" aria-label="Choose listing visual">
            {props.slides.map((slide, index) => (
              <button
                aria-label={`Show ${slide.title}`}
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "market-carousel-dot active" : "market-carousel-dot"}
                key={slide.id}
                onClick={() => setActiveIndex(index)}
                role="tab"
                type="button"
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export type { PhotoCarouselSlide };
