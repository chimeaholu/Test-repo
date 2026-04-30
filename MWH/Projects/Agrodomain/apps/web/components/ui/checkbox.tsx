import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, id, ...rest }, ref) {
    const checkId = id ?? `cb-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <label className={clsx("ds-checkbox-wrap", className)} htmlFor={checkId}>
        <input ref={ref} type="checkbox" className="ds-checkbox" id={checkId} {...rest} />
        <span>{label}</span>
      </label>
    );
  },
);
