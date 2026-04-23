import React from "react";
import { designTokens } from "../../lib/design-tokens";

interface IllustrationProps {
  size?: number;
  className?: string;
}

const defaultSize = 200;

/** No listings found -- empty market stall */
export function NoListingsIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="80" ry="12" fill={designTokens.color.accentSoft} />
      <rect x="40" y="80" width="120" height="80" rx="6" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <path d="M30 80h140l-10-20H40L30 80z" fill={designTokens.color.brand} opacity="0.2" />
      <path d="M30 80h140" stroke={designTokens.color.brand} strokeWidth="2" />
      <line x1="55" y1="110" x2="145" y2="110" stroke={designTokens.color.line} strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="55" y1="135" x2="145" y2="135" stroke={designTokens.color.line} strokeWidth="1.5" strokeDasharray="6 4" />
      <text x="100" y="128" textAnchor="middle" fontSize="28" fontFamily="serif" fill={designTokens.color.lineStrong} opacity="0.5">?</text>
    </svg>
  );
}

/** No transactions -- empty wallet */
export function NoTransactionsIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="165" rx="60" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="45" y="60" width="110" height="80" rx="10" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <path d="M45 80h110" stroke={designTokens.color.line} strokeWidth="1.5" />
      <rect x="130" y="95" width="25" height="18" rx="9" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <line x1="65" y1="100" x2="115" y2="100" stroke={designTokens.color.line} strokeWidth="1.5" strokeDasharray="5 4" />
      <line x1="65" y1="115" x2="100" y2="115" stroke={designTokens.color.line} strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="90" y="130" fontSize="14" fontFamily="sans-serif" fill={designTokens.color.lineStrong} opacity="0.5">0.00</text>
    </svg>
  );
}

/** No notifications -- quiet bell */
export function NoNotificationsIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <path d="M100 40c-22 0-40 18-40 40v30c0 5-8 10-8 10h96s-8-5-8-10V80c0-22-18-40-40-40z" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <circle cx="100" cy="132" r="8" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.line} strokeWidth="1.5" />
      <circle cx="100" cy="38" r="5" fill={designTokens.color.surfaceStrong} stroke={designTokens.color.line} strokeWidth="1.5" />
      <text x="138" y="60" fontSize="16" fontFamily="sans-serif" fill={designTokens.color.lineStrong} opacity="0.4">z</text>
      <text x="148" y="48" fontSize="12" fontFamily="sans-serif" fill={designTokens.color.lineStrong} opacity="0.3">z</text>
      <text x="155" y="38" fontSize="9" fontFamily="sans-serif" fill={designTokens.color.lineStrong} opacity="0.2">z</text>
      <ellipse cx="100" cy="165" rx="50" ry="6" fill={designTokens.color.accentSoft} />
    </svg>
  );
}

/** No fields registered -- empty plot of land */
export function NoFieldsIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <rect x="20" y="30" width="160" height="100" rx="12" fill={designTokens.color.surfaceElevated} />
      <line x1="20" y1="130" x2="180" y2="130" stroke={designTokens.color.line} strokeWidth="2" />
      <rect x="40" y="100" width="50" height="30" rx="2" stroke={designTokens.color.lineStrong} strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
      <rect x="110" y="100" width="50" height="30" rx="2" stroke={designTokens.color.lineStrong} strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
      <circle cx="100" cy="115" r="14" fill={designTokens.color.brand} opacity="0.12" />
      <line x1="100" y1="108" x2="100" y2="122" stroke={designTokens.color.brand} strokeWidth="2" />
      <line x1="93" y1="115" x2="107" y2="115" stroke={designTokens.color.brand} strokeWidth="2" />
      <ellipse cx="100" cy="165" rx="70" ry="10" fill={designTokens.color.accentSoft} />
      <circle cx="155" cy="55" r="12" fill={designTokens.color.accent} opacity="0.2" />
    </svg>
  );
}
