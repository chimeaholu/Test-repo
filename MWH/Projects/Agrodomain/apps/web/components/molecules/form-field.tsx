import type { ReactNode } from "react";
import { clsx } from "clsx";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, required, error, helper, className, children }: FormFieldProps) {
  return (
    <div className={clsx("ds-form-field", className)}>
      <label className={clsx("ds-form-label", required && "ds-form-label-required")} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && <span className="ds-form-error" role="alert">{error}</span>}
      {!error && helper && <span className="ds-form-helper">{helper}</span>}
    </div>
  );
}
