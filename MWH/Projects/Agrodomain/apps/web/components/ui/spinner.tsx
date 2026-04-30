import { clsx } from "clsx";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  overlay?: boolean;
  className?: string;
  label?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: "ds-spinner-sm",
  md: "ds-spinner-md",
  lg: "ds-spinner-lg",
};

export function Spinner({ size = "md", overlay, className, label = "Loading" }: SpinnerProps) {
  const spinner = (
    <span className={clsx("ds-spinner", sizeClass[size], className)} role="status" aria-label={label} />
  );

  if (overlay) {
    return <div className="ds-spinner-overlay">{spinner}</div>;
  }

  return spinner;
}
