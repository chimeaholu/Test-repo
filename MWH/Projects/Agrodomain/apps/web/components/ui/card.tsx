import * as React from "react";
import { clsx } from "clsx";

type HTMLAttributes<T> = React.HTMLAttributes<T>;
type ReactNode = React.ReactNode;

type CardVariant = "flat" | "elevated" | "interactive";

interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}

export function Card({ variant, className, children, ...rest }: CardProps) {
  return (
    <section
      className={clsx(
        "ds-card",
        variant === "elevated" && "ds-card-elevated",
        variant === "interactive" && "ds-card-interactive",
        variant === "flat" && "ds-card-flat",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}
