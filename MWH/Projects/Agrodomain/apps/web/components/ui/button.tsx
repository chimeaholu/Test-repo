import Link from "next/link";
import * as React from "react";
import { clsx } from "clsx";

const { forwardRef } = React;
type ButtonHTMLAttributes<T> = React.ButtonHTMLAttributes<T>;
type ReactNode = React.ReactNode;

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "ds-btn-primary",
  secondary: "ds-btn-secondary",
  ghost: "ds-btn-ghost",
  danger: "ds-btn-danger",
  link: "ds-btn-link",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "ds-btn-sm",
  md: "ds-btn-md",
  lg: "ds-btn-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading, href, className, children, disabled, ...rest },
    ref,
  ) {
    const cls = clsx(
      "ds-btn",
      variantClass[variant],
      sizeClass[size],
      loading && "ds-btn-loading",
      className,
    );

    if (href && !disabled) {
      return (
        <Link className={cls} href={href}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={cls}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        type="button"
        {...rest}
      >
        {children}
      </button>
    );
  },
);
