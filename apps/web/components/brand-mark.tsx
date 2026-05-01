import { clsx } from "clsx";
import React from "react";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
  light?: boolean;
  markClassName?: string;
  wordmarkClassName?: string;
  caption?: string;
};

export function BrandMark({
  caption,
  className,
  compact = false,
  light = false,
  markClassName,
  wordmarkClassName,
}: BrandMarkProps) {
  return (
    <span className={clsx("agro-brand", light && "is-light", className)}>
      <svg
        aria-hidden="true"
        className={clsx("agro-brand-logo", markClassName)}
        viewBox="0 0 36 36"
      >
        <circle cx="18" cy="18" r="16" fill="currentColor" opacity="0.12" />
        <path
          d="M18 28V16c0-6 3.5-10.5 10-13-6.5 2.5-8.5 7-10 13z"
          fill="currentColor"
        />
        <path
          d="M18 28V16c0-6-3.5-10.5-10-13 6.5 2.5 8.5 7 10 13z"
          fill="currentColor"
          opacity="0.58"
        />
        <circle cx="18" cy="30" r="2" fill="#d4922b" />
      </svg>
      {compact ? null : (
        <span className="agro-brand-copy">
          <span className={clsx("agro-brand-wordmark", wordmarkClassName)}>Agrodomain</span>
          {caption ? <span className="agro-brand-caption">{caption}</span> : null}
        </span>
      )}
    </span>
  );
}
