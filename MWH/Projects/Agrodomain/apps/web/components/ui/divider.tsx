import { clsx } from "clsx";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={clsx("ds-divider-label", className)} role="separator">
        {label}
      </div>
    );
  }
  return <hr className={clsx("ds-divider", className)} />;
}
