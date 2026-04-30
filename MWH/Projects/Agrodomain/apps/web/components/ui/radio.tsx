import React, { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function RadioGroup({ name, options, value, onChange, className }: RadioGroupProps) {
  return (
    <div role="radiogroup" className={clsx("flex flex-col gap-2", className)}>
      {options.map((opt) => (
        <label key={opt.value} className="ds-radio-wrap">
          <input
            type="radio"
            className="ds-radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={opt.disabled}
            onChange={() => onChange?.(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
