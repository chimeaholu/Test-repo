import React from "react";

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const defaults: Required<Pick<IconProps, "size" | "color">> = {
  size: 24,
  color: "currentColor",
};

function wrap(props: IconProps) {
  return {
    width: props.size ?? defaults.size,
    height: props.size ?? defaults.size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: props.color ?? defaults.color,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: props.className,
    "aria-hidden": true as const,
  };
}

/** Maize / corn cob with husk leaves */
export function MaizeIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <ellipse cx="12" cy="13" rx="3.5" ry="6.5" />
      <line x1="12" y1="7" x2="12" y2="19" />
      <line x1="9" y1="9" x2="9" y2="17" />
      <line x1="15" y1="9" x2="15" y2="17" />
      <path d="M8.5 8c-2-1-3.5-3-3-5 2 .5 3.5 2.5 3 5z" />
      <path d="M15.5 8c2-1 3.5-3 3-5-2 .5-3.5 2.5-3 5z" />
      <path d="M11 6.5c-1-2-.5-4 1-5" />
      <path d="M13 6.5c1-2 .5-4-1-5" />
    </svg>
  );
}

/** Cassava / tuber root with leaves */
export function CassavaIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M12 22c-1 0-2.5-1.5-3-4s-.5-5 0-7c.5-1.5 1.5-2.5 3-2.5s2.5 1 3 2.5c.5 2 .5 4.5 0 7s-2 4-3 4z" />
      <line x1="12" y1="8.5" x2="12" y2="4" />
      <path d="M12 5L8 2" />
      <path d="M12 5L16 2" />
      <path d="M12 4L9 1.5" />
      <path d="M12 4L15 1.5" />
      <path d="M10 20c-.5.5-1.5 1-2 1" />
      <path d="M14 20c.5.5 1.5 1 2 1" />
    </svg>
  );
}

/** Cocoa pod on branch */
export function CocoaIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M12 4c-3 0-5 3-5 8s2 8 5 8 5-3 5-8-2-8-5-8z" />
      <path d="M9.5 6c-.5 2-.5 6 0 8" />
      <path d="M14.5 6c.5 2 .5 6 0 8" />
      <path d="M12 4v16" />
      <path d="M12 4c0-1 1-2 2.5-2.5" />
    </svg>
  );
}

/** Yam tuber */
export function YamIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M6 10c0-2 1.5-4 4-4.5C11.5 5 13 5.5 14 6c1 .5 2.5 1.5 3 3 .5 1.5.5 3 0 4.5-.5 1.5-1.5 3-3 3.5-1.5.5-3.5.5-5 0s-3-2-3-3.5V10z" />
      <path d="M18 11c1 .5 2 .5 3 0" />
      <path d="M17.5 13c1 .5 2 1 3 .5" />
      <path d="M8 8.5c1 .5 3 .5 4 0" />
      <path d="M7 12c2 .5 4 .5 6 0" />
      <path d="M10 5.5c-1-2-1-3.5 0-5" />
    </svg>
  );
}

/** Rice stalk with grain panicle */
export function RiceIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <line x1="12" y1="22" x2="12" y2="6" />
      <path d="M12 7c-1 .5-2.5 1-3 2.5" />
      <path d="M12 9c-1 .5-2.5 1-3 2.5" />
      <path d="M12 11c-1 .5-2 1-2.5 2" />
      <path d="M12 7c1 .5 2.5 1 3 2.5" />
      <path d="M12 9c1 .5 2.5 1 3 2.5" />
      <path d="M12 11c1 .5 2 1 2.5 2" />
      <path d="M12 6c0-1 .5-2 1-3" />
      <path d="M12 6c0-1-.5-2-1-3" />
      <path d="M12 16c-2 0-4 1-5 2" />
      <path d="M12 18c2 0 4 1 5 2" />
    </svg>
  );
}

/** Soybean pod */
export function SoybeanIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M7 8c0-2 2-4 5-4s5 2 5 4c0 2-2 4-5 4s-5-2-5-4z" />
      <circle cx="10" cy="8" r="1.2" />
      <circle cx="14" cy="8" r="1.2" />
      <path d="M8 14c0-1.5 1.5-3 4-3s4 1.5 4 3-1.5 3-4 3-4-1.5-4-3z" />
      <circle cx="12" cy="14" r="1" />
      <path d="M12 4V2" />
      <path d="M7 5c-2-1-2-3-1-4 1.5.5 2.5 2 1 4z" />
      <path d="M17 5c2-1 2-3 1-4-1.5.5-2.5 2-1 4z" />
    </svg>
  );
}

/** Tomato fruit */
export function TomatoIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 6v14" />
      <path d="M5.5 10.5c3 1 6 1 13 0" />
      <path d="M9 7c-1-2 0-4 1-5" />
      <path d="M15 7c1-2 0-4-1-5" />
      <path d="M12 6V3" />
      <path d="M9 11a1.5 1.5 0 0 0 0 3" />
    </svg>
  );
}

/** Pepper / chili */
export function PepperIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M10 7c-2 1-3.5 4-3.5 7 0 3 1.5 5 3.5 6 1 .5 2 .5 3 0 2-1 3.5-3 3.5-6 0-3-1.5-6-3.5-7" />
      <path d="M11.5 7V4c0-1 .5-2 1.5-2.5" />
      <path d="M8.5 12c2 .5 5 .5 7 0" />
      <path d="M9 15c1.5.5 4.5.5 6 0" />
      <path d="M10 7.5c-.5-1 .5-2 2-2s2.5 1 2 2" />
    </svg>
  );
}

/** Plantain / banana bunch */
export function PlantainIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M12 3v3" />
      <path d="M8 7c-1 0-2 1-2 2.5s1.5 2 3 1.5" />
      <path d="M16 7c1 0 2 1 2 2.5s-1.5 2-3 1.5" />
      <path d="M7 11c-1 .5-1.5 1.5-1 3s2 2 3 1.5" />
      <path d="M17 11c1 .5 1.5 1.5 1 3s-2 2-3 1.5" />
      <path d="M8 16c-1 .5-1 2-.5 3s2 1.5 2.5.5" />
      <path d="M16 16c1 .5 1 2 .5 3s-2 1.5-2.5.5" />
      <line x1="12" y1="6" x2="12" y2="21" />
    </svg>
  );
}

/** Groundnut / peanut in shell */
export function GroundnutIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <ellipse cx="12" cy="8" rx="3.5" ry="4" />
      <ellipse cx="12" cy="16" rx="3" ry="3.5" />
      <path d="M8.5 11c1 .5 2.5.8 3.5.8s2.5-.3 3.5-.8" />
      <path d="M9 12.5c.8.5 2 .7 3 .7s2.2-.2 3-.7" />
      <path d="M10 6c.5.5 1.5.8 2 .8s1.5-.3 2-.8" />
      <path d="M10.5 16c.3.5 1 .8 1.5.8s1.2-.3 1.5-.8" />
      <path d="M12 4V2" />
    </svg>
  );
}

/** Oil palm tree / fruit bunch */
export function PalmIcon(props: IconProps) {
  return (
    <svg {...wrap(props)}>
      <path d="M12 22V10" />
      <path d="M12 10c-3-1-6-1-8 1" />
      <path d="M12 10c3-1 6-1 8 1" />
      <path d="M12 9c-2-2-5-3-7-2" />
      <path d="M12 9c2-2 5-3 7-2" />
      <path d="M12 8c-1-2-3-4-5-4" />
      <path d="M12 8c1-2 3-4 5-4" />
      <circle cx="10.5" cy="12" r="1" />
      <circle cx="13.5" cy="12" r="1" />
      <circle cx="12" cy="13.5" r="1" />
      <path d="M11 15h2" />
      <path d="M11 18h2" />
    </svg>
  );
}
