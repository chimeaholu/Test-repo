import React from "react";
import { designTokens } from "../lib/design-tokens";
import {
  MaizeIcon,
  CassavaIcon,
  CocoaIcon,
  YamIcon,
  RiceIcon,
  SoybeanIcon,
  TomatoIcon,
  PepperIcon,
  PlantainIcon,
  GroundnutIcon,
  PalmIcon,
  SeedIcon,
} from "./icons";
import type { IconProps } from "./icons";

export type CropType =
  | "maize"
  | "cassava"
  | "cocoa"
  | "yam"
  | "rice"
  | "soybean"
  | "tomato"
  | "pepper"
  | "plantain"
  | "groundnut"
  | "palm"
  | "other";

type PlaceholderSize = "sm" | "md" | "lg" | "xl";

interface PhotoPlaceholderProps {
  cropType: CropType;
  size?: PlaceholderSize;
  className?: string;
}

const gradients: Record<CropType, string> = {
  maize: `linear-gradient(135deg, #f5e6a3 0%, ${designTokens.color.accentSoft} 50%, #e8d48b 100%)`,
  cassava: `linear-gradient(135deg, ${designTokens.color.surfaceStrong} 0%, #d4c8a8 50%, ${designTokens.color.accentSoft} 100%)`,
  cocoa: `linear-gradient(135deg, #8b6342 0%, #a67c52 50%, #c49a6c 100%)`,
  yam: `linear-gradient(135deg, #c9a87c 0%, #b08860 50%, ${designTokens.color.accentSoft} 100%)`,
  rice: `linear-gradient(135deg, #f0ead6 0%, ${designTokens.color.surfaceElevated} 50%, #e5dfc6 100%)`,
  soybean: `linear-gradient(135deg, #d4cc94 0%, #c5bd84 50%, #b6ae74 100%)`,
  tomato: `linear-gradient(135deg, #e8665a 0%, #d44f42 50%, #c23a2e 100%)`,
  pepper: `linear-gradient(135deg, #e05c3a 0%, #c84b2f 50%, #b03d24 100%)`,
  plantain: `linear-gradient(135deg, #d4b84a 0%, #c2a63e 50%, #a89030 100%)`,
  groundnut: `linear-gradient(135deg, #c4a46a 0%, #b89458 50%, ${designTokens.color.accentSoft} 100%)`,
  palm: `linear-gradient(135deg, ${designTokens.color.brand} 0%, ${designTokens.color.brandStrong} 50%, #1a5e3f 100%)`,
  other: `linear-gradient(135deg, ${designTokens.color.surfaceStrong} 0%, ${designTokens.color.accentSoft} 100%)`,
};

const iconColors: Record<CropType, string> = {
  maize: "#8a7520",
  cassava: designTokens.color.brandStrong,
  cocoa: "#f0dbc2",
  yam: designTokens.color.brandStrong,
  rice: designTokens.color.brand,
  soybean: "#5a5218",
  tomato: "#fff5f0",
  pepper: "#fff5f0",
  plantain: "#5c4a10",
  groundnut: "#5a4218",
  palm: "#a8e6c4",
  other: designTokens.color.brand,
};

const sizeMap: Record<PlaceholderSize, { px: number; icon: number; radius: string }> = {
  sm: { px: 64, icon: 24, radius: designTokens.radius.xs },
  md: { px: 120, icon: 40, radius: designTokens.radius.sm },
  lg: { px: 200, icon: 64, radius: designTokens.radius.md },
  xl: { px: 300, icon: 96, radius: designTokens.radius.lg },
};

function getCropIcon(cropType: CropType, iconProps: IconProps) {
  switch (cropType) {
    case "maize": return <MaizeIcon {...iconProps} />;
    case "cassava": return <CassavaIcon {...iconProps} />;
    case "cocoa": return <CocoaIcon {...iconProps} />;
    case "yam": return <YamIcon {...iconProps} />;
    case "rice": return <RiceIcon {...iconProps} />;
    case "soybean": return <SoybeanIcon {...iconProps} />;
    case "tomato": return <TomatoIcon {...iconProps} />;
    case "pepper": return <PepperIcon {...iconProps} />;
    case "plantain": return <PlantainIcon {...iconProps} />;
    case "groundnut": return <GroundnutIcon {...iconProps} />;
    case "palm": return <PalmIcon {...iconProps} />;
    case "other":
    default: return <SeedIcon {...iconProps} />;
  }
}

/**
 * Renders a crop-type-specific placeholder image using CSS gradients and SVG
 * icons. No external image dependencies.
 *
 * @example
 * <PhotoPlaceholder cropType="maize" size="lg" />
 */
export function PhotoPlaceholder({ cropType, size = "md", className }: PhotoPlaceholderProps) {
  const dim = sizeMap[size];
  const icon = getCropIcon(cropType, {
    size: dim.icon,
    color: iconColors[cropType],
  });

  return (
    <div
      className={className}
      role="img"
      aria-label={`${cropType} photo placeholder`}
      style={{
        width: dim.px,
        height: dim.px,
        borderRadius: dim.radius,
        background: gradients[cropType],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${designTokens.color.line}`,
      }}
    >
      {icon}
    </div>
  );
}
