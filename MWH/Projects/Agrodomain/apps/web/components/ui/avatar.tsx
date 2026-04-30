import * as React from "react";
import { clsx } from "clsx";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: "ds-avatar-sm",
  md: "ds-avatar-md",
  lg: "ds-avatar-lg",
  xl: "ds-avatar-xl",
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span className={clsx("ds-avatar", sizeClass[size], className)} aria-label={name} role="img">
      {src ? (
        <img src={src} alt={name} loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
