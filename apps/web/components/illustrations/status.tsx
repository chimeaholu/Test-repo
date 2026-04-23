import React from "react";
import { designTokens } from "../../lib/design-tokens";

interface IllustrationProps {
  size?: number;
  className?: string;
}

const defaultSize = 200;

/** 404 -- lost in the field */
export function NotFoundIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="80" ry="10" fill={designTokens.color.accentSoft} />
      <line x1="20" y1="155" x2="180" y2="155" stroke={designTokens.color.line} strokeWidth="1" />
      <line x1="20" y1="145" x2="180" y2="145" stroke={designTokens.color.line} strokeWidth="1" />
      <rect x="95" y="55" width="10" height="100" rx="2" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <path d="M105 65h40l8 10-8 10H105V65z" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="1.5" />
      <path d="M95 90H55l-8 10 8 10h40V90z" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="1.5" />
      <text x="130" y="80" textAnchor="middle" fontSize="14" fill={designTokens.color.lineStrong}>?</text>
      <text x="70" y="105" textAnchor="middle" fontSize="14" fill={designTokens.color.lineStrong}>?</text>
      <text x="100" y="45" textAnchor="middle" fontSize="22" fontWeight="bold" fontFamily="serif" fill={designTokens.color.accent} opacity="0.6">404</text>
    </svg>
  );
}

/** 500 -- broken farm equipment */
export function ServerErrorIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="70" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="50" y="70" width="100" height="70" rx="8" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <rect x="65" y="82" width="70" height="35" rx="4" fill={designTokens.color.danger} fillOpacity="0.08" stroke={designTokens.color.danger} strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="90" y1="92" x2="110" y2="108" stroke={designTokens.color.danger} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="110" y1="92" x2="90" y2="108" stroke={designTokens.color.danger} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="75" cy="130" r="8" fill="none" stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <circle cx="75" cy="130" r="3" fill={designTokens.color.lineStrong} />
      <circle cx="95" cy="133" r="5" fill="none" stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <path d="M120 65c2-5 8-8 10-5" stroke={designTokens.color.lineStrong} strokeWidth="1.5" opacity="0.3" />
      <path d="M130 60c2-4 6-6 8-3" stroke={designTokens.color.lineStrong} strokeWidth="1.5" opacity="0.2" />
      <path d="M140 145l15-15" stroke={designTokens.color.accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="157" cy="128" r="5" fill="none" stroke={designTokens.color.accent} strokeWidth="1.5" />
    </svg>
  );
}

/** Offline -- disconnected signal */
export function OfflineIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="60" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="72" y="50" width="56" height="100" rx="8" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <rect x="78" y="62" width="44" height="70" rx="4" fill={designTokens.color.surfaceStrong} />
      <path d="M85 85a22 22 0 0 1 30 0" stroke={designTokens.color.lineStrong} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M90 92a14 14 0 0 1 20 0" stroke={designTokens.color.lineStrong} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M95 99a6 6 0 0 1 10 0" stroke={designTokens.color.lineStrong} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="100" cy="105" r="3" fill={designTokens.color.lineStrong} opacity="0.3" />
      <line x1="82" y1="115" x2="118" y2="78" stroke={designTokens.color.danger} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="142" x2="108" y2="142" stroke={designTokens.color.line} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Listing published successfully */
export function ListingPublishedIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="70" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="55" y="50" width="90" height="100" rx="10" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.brand} strokeWidth="2" />
      <circle cx="100" cy="90" r="22" fill={designTokens.color.brand} opacity="0.12" />
      <path d="M88 90l8 8 16-16" stroke={designTokens.color.brand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="70" y="122" width="60" height="5" rx="2.5" fill={designTokens.color.inkSoft} opacity="0.2" />
      <rect x="80" y="133" width="40" height="4" rx="2" fill={designTokens.color.lineStrong} opacity="0.2" />
      <path d="M150 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={designTokens.color.accent} opacity="0.5" />
      <path d="M45 60l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={designTokens.color.brand} opacity="0.4" />
      <path d="M160 100l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill={designTokens.color.brand} opacity="0.3" />
    </svg>
  );
}

/** Payment sent successfully */
export function PaymentSentIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="60" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="50" y="65" width="80" height="50" rx="8" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.brand} strokeWidth="2" />
      <circle cx="90" cy="90" r="16" fill={designTokens.color.brand} opacity="0.1" />
      <text x="90" y="96" textAnchor="middle" fontSize="16" fontWeight="bold" fill={designTokens.color.brand} opacity="0.6">$</text>
      <path d="M120 85l20-15" stroke={designTokens.color.brand} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M135 68l5 2-2 5" stroke={designTokens.color.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="135" r="16" fill={designTokens.color.success} opacity="0.12" />
      <path d="M92 135l5 5 11-11" stroke={designTokens.color.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M155 55l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={designTokens.color.accent} opacity="0.4" />
    </svg>
  );
}

/** Fund contribution success */
export function FundContributedIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="70" ry="8" fill={designTokens.color.accentSoft} />
      <ellipse cx="100" cy="110" rx="45" ry="35" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.brand} strokeWidth="2" />
      <ellipse cx="75" cy="82" rx="8" ry="10" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.brand} strokeWidth="1.5" />
      <circle cx="80" cy="100" r="3" fill={designTokens.color.inkSoft} />
      <ellipse cx="58" cy="110" rx="8" ry="6" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.brand} strokeWidth="1.5" />
      <circle cx="55" cy="109" r="1.5" fill={designTokens.color.inkSoft} />
      <circle cx="61" cy="109" r="1.5" fill={designTokens.color.inkSoft} />
      <rect x="72" y="138" width="8" height="16" rx="3" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.brand} strokeWidth="1.5" />
      <rect x="120" y="138" width="8" height="16" rx="3" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.brand} strokeWidth="1.5" />
      <rect x="92" y="73" width="16" height="4" rx="2" fill={designTokens.color.brand} opacity="0.3" />
      <circle cx="100" cy="63" r="8" fill={designTokens.color.accent} opacity="0.4" stroke={designTokens.color.accent} strokeWidth="1.5" />
      <text x="100" y="67" textAnchor="middle" fontSize="9" fontWeight="bold" fill={designTokens.color.accent}>+</text>
      <circle cx="140" cy="80" r="12" fill={designTokens.color.success} opacity="0.12" />
      <path d="M134 80l4 4 8-8" stroke={designTokens.color.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
