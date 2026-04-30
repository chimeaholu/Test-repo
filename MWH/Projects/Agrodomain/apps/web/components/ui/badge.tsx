import * as React from "react";
import { clsx } from "clsx";

type ReactNode = React.ReactNode;

type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "brand";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  neutral: "ds-badge-neutral",
  success: "ds-badge-success",
  warning: "ds-badge-warning",
  error: "ds-badge-error",
  info: "ds-badge-info",
  brand: "ds-badge-brand",
};

export function Badge({ variant = "neutral", className, children }: BadgeProps) {
  return (
    <span className={clsx("ds-badge", variantClass[variant], className)}>
      {children}
    </span>
  );
}
