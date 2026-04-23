import React from "react";
import { designTokens } from "../../lib/design-tokens";

interface IllustrationProps {
  size?: number;
  className?: string;
}

const defaultSize = 200;

/** Step 1: Role selection -- figures representing different roles */
export function RoleSelectionIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="80" ry="10" fill={designTokens.color.accentSoft} />
      {/* farmer */}
      <circle cx="60" cy="75" r="14" fill={designTokens.color.brand} opacity="0.2" stroke={designTokens.color.brand} strokeWidth="1.5" />
      <rect x="48" y="95" width="24" height="40" rx="6" fill={designTokens.color.brand} opacity="0.15" stroke={designTokens.color.brand} strokeWidth="1.5" />
      <ellipse cx="60" cy="63" rx="16" ry="4" fill={designTokens.color.accent} opacity="0.3" />
      <rect x="52" y="56" width="16" height="8" rx="3" fill={designTokens.color.accent} opacity="0.25" />
      {/* buyer */}
      <circle cx="100" cy="75" r="14" fill={designTokens.color.accent} opacity="0.2" stroke={designTokens.color.accent} strokeWidth="1.5" />
      <rect x="88" y="95" width="24" height="40" rx="6" fill={designTokens.color.accent} opacity="0.15" stroke={designTokens.color.accent} strokeWidth="1.5" />
      <rect x="92" y="125" width="16" height="12" rx="2" fill={designTokens.color.accent} opacity="0.3" />
      {/* advisor */}
      <circle cx="140" cy="75" r="14" fill={designTokens.color.info} opacity="0.2" stroke={designTokens.color.info} strokeWidth="1.5" />
      <rect x="128" y="95" width="24" height="40" rx="6" fill={designTokens.color.info} opacity="0.15" stroke={designTokens.color.info} strokeWidth="1.5" />
      <rect x="133" y="105" width="14" height="18" rx="2" fill={designTokens.color.info} opacity="0.25" />
      <line x1="136" y1="111" x2="144" y2="111" stroke={designTokens.color.info} strokeWidth="1" opacity="0.5" />
      <line x1="136" y1="115" x2="142" y2="115" stroke={designTokens.color.info} strokeWidth="1" opacity="0.5" />
      {/* selection radios */}
      <circle cx="60" cy="150" r="6" fill="none" stroke={designTokens.color.brand} strokeWidth="2" />
      <circle cx="100" cy="150" r="6" fill="none" stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <circle cx="140" cy="150" r="6" fill="none" stroke={designTokens.color.lineStrong} strokeWidth="1.5" />
      <circle cx="60" cy="150" r="3" fill={designTokens.color.brand} />
    </svg>
  );
}

/** Step 2: Farm setup -- field with measurement markers */
export function FarmSetupIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <rect x="20" y="25" width="160" height="80" rx="10" fill={designTokens.color.surfaceElevated} />
      <circle cx="155" cy="50" r="16" fill={designTokens.color.accent} opacity="0.2" />
      <path d="M30 110L60 90h80l30 20v40H30v-40z" fill={designTokens.color.brand} opacity="0.1" stroke={designTokens.color.brand} strokeWidth="1.5" />
      <line x1="70" y1="95" x2="55" y2="115" stroke={designTokens.color.brand} strokeWidth="1" opacity="0.4" />
      <line x1="90" y1="93" x2="75" y2="118" stroke={designTokens.color.brand} strokeWidth="1" opacity="0.4" />
      <line x1="110" y1="93" x2="95" y2="118" stroke={designTokens.color.brand} strokeWidth="1" opacity="0.4" />
      <line x1="130" y1="95" x2="115" y2="118" stroke={designTokens.color.brand} strokeWidth="1" opacity="0.4" />
      <circle cx="60" cy="90" r="4" fill={designTokens.color.danger} opacity="0.7" />
      <circle cx="140" cy="90" r="4" fill={designTokens.color.danger} opacity="0.7" />
      <circle cx="30" cy="110" r="4" fill={designTokens.color.danger} opacity="0.7" />
      <circle cx="170" cy="110" r="4" fill={designTokens.color.danger} opacity="0.7" />
      <line x1="60" y1="85" x2="140" y2="85" stroke={designTokens.color.inkSoft} strokeWidth="1" strokeDasharray="4 3" />
      <text x="100" y="82" textAnchor="middle" fontSize="10" fill={designTokens.color.inkSoft}>2.5 ha</text>
      <ellipse cx="100" cy="170" rx="70" ry="8" fill={designTokens.color.accentSoft} />
    </svg>
  );
}

/** Step 3: First listing -- product card being placed */
export function FirstListingIllustration({ size = defaultSize, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden>
      <ellipse cx="100" cy="170" rx="70" ry="8" fill={designTokens.color.accentSoft} />
      <rect x="50" y="40" width="100" height="120" rx="12" fill={designTokens.color.surfaceElevated} stroke={designTokens.color.line} strokeWidth="2" />
      <rect x="62" y="52" width="76" height="50" rx="6" fill={designTokens.color.brand} opacity="0.1" />
      <circle cx="100" cy="77" r="12" fill={designTokens.color.brand} opacity="0.15" />
      <path d="M96 74v6M100 72v8M104 74v6" stroke={designTokens.color.brand} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="62" y="112" width="50" height="6" rx="3" fill={designTokens.color.inkSoft} opacity="0.2" />
      <rect x="62" y="124" width="35" height="5" rx="2.5" fill={designTokens.color.lineStrong} opacity="0.2" />
      <rect x="104" y="120" width="34" height="16" rx="8" fill={designTokens.color.brand} opacity="0.15" />
      <text x="121" y="131" textAnchor="middle" fontSize="9" fontWeight="bold" fill={designTokens.color.brand} opacity="0.7">GHS</text>
      <path d="M155 50l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill={designTokens.color.accent} opacity="0.4" />
      <path d="M40 70l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={designTokens.color.brand} opacity="0.3" />
    </svg>
  );
}
