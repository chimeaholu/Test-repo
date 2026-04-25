import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  label: string;
  badge?: boolean;
  children: ReactNode;
}

const sizeClass: Record<IconButtonSize, string> = {
  sm: "ds-icon-btn-sm",
  md: "ds-icon-btn-md",
  lg: "ds-icon-btn-lg",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = "md", label, badge, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={clsx("ds-icon-btn", sizeClass[size], className)}
        aria-label={label}
        type="button"
        {...rest}
      >
        {children}
        {badge && <span className="ds-icon-btn-badge" />}
      </button>
    );
  },
);
