import type { ReactNode } from "react";
import { clsx } from "clsx";

interface TagProps {
  onRemove?: () => void;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Tag({ onRemove, icon, className, children }: TagProps) {
  return (
    <span className={clsx("ds-tag", className)}>
      {icon}
      {children}
      {onRemove && (
        <button className="ds-tag-remove" onClick={onRemove} aria-label="Remove" type="button">
          ✕
        </button>
      )}
    </span>
  );
}
