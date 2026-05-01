import { clsx } from "clsx";

type SkeletonVariant = "text" | "heading" | "avatar" | "card" | "row";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

const variantClass: Record<SkeletonVariant, string> = {
  text: "ds-skeleton-text",
  heading: "ds-skeleton-heading",
  avatar: "ds-skeleton-avatar",
  card: "ds-skeleton-card",
  row: "ds-skeleton-row",
};

export function Skeleton({ variant = "text", width, height, className }: SkeletonProps) {
  const sizeMap: Record<SkeletonVariant, { w?: string; h?: string }> = {
    text: { h: "1rem" },
    heading: { h: "1.5rem", w: "60%" },
    avatar: { w: "40px", h: "40px" },
    card: { h: "120px" },
    row: { h: "2.5rem" },
  };
  const defaults = sizeMap[variant];

  return (
    <div
      className={clsx("ds-skeleton", variantClass[variant], className)}
      style={{ width: width ?? defaults.w, height: height ?? defaults.h }}
      aria-hidden="true"
    />
  );
}

/** Convenience: renders N skeleton text lines */
export function SkeletonLines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === count - 1 ? "75%" : "100%"} />
      ))}
    </div>
  );
}
