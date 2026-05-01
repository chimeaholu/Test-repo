import * as React from "react";
import { clsx } from "clsx";

const { forwardRef } = React;
type InputHTMLAttributes<T> = React.InputHTMLAttributes<T>;
type TextareaHTMLAttributes<T> = React.TextareaHTMLAttributes<T>;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  inputSize?: "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ error, inputSize = "md", className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "ds-input",
          inputSize === "lg" && "ds-input-lg",
          error && "ds-input-error",
          className,
        )}
        aria-invalid={error || undefined}
        {...rest}
      />
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={clsx("ds-input ds-textarea", error && "ds-input-error", className)}
        aria-invalid={error || undefined}
        {...rest}
      />
    );
  },
);
