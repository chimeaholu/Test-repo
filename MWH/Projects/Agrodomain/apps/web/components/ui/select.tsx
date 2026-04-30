import * as React from "react";
import { clsx } from "clsx";

const { forwardRef } = React;
type SelectHTMLAttributes<T> = React.SelectHTMLAttributes<T>;

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, placeholder, error, className, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={clsx("ds-input ds-select", error && "ds-input-error", className)}
        aria-invalid={error || undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
);
