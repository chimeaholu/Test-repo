/**
 * SVG Illustrations for empty states, onboarding, and error pages.
 *
 * All illustrations are SVG-based React components for scalability.
 * They accept className for size/color overrides.
 *
 * Downstream lane (RB-018) will implement the full set:
 * - empty-state.tsx: illustrations for each empty state
 * - onboarding.tsx: step illustrations for the onboarding wizard
 * - error.tsx: illustrations for error pages (404, 500, etc.)
 */

import type { SVGProps } from "react";

/** Generic empty/placeholder illustration — leaf sprout motif */
export function EmptyIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" fill="none" width="120" height="120" {...props}>
      <circle cx="60" cy="60" r="56" fill="var(--color-brand-50, #eef5f1)" />
      <path
        d="M60 85V55c0-12 8-22 20-26-12 4-18 14-20 26z"
        fill="var(--color-brand-300, #7ab994)"
        opacity="0.6"
      />
      <path
        d="M60 85V55c0-12-8-22-20-26 12 4 18 14 20 26z"
        fill="var(--color-brand-500, #2d8a53)"
        opacity="0.4"
      />
      <circle cx="60" cy="88" r="3" fill="var(--color-accent-400, #e5a94e)" />
    </svg>
  );
}

/** Error illustration — warning triangle */
export function ErrorIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" fill="none" width="120" height="120" {...props}>
      <circle cx="60" cy="60" r="56" fill="var(--color-error-light, #fdf0ee)" />
      <path
        d="M60 30L90 90H30L60 30z"
        stroke="var(--color-error, #c44b3b)"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="72" r="3" fill="var(--color-error, #c44b3b)" />
      <rect x="58" y="48" width="4" height="18" rx="2" fill="var(--color-error, #c44b3b)" />
    </svg>
  );
}
