"use client";

import React, { useState, type ReactNode } from "react";
import { clsx } from "clsx";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<AlertVariant, string> = {
  info: "ds-alert-info",
  success: "ds-alert-success",
  warning: "ds-alert-warning",
  error: "ds-alert-error",
};

export function Alert({ variant = "info", dismissible, className, children }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={clsx("ds-alert", variantClass[variant], className)} role="alert">
      <div style={{ flex: 1 }}>{children}</div>
      {dismissible && (
        <button className="ds-alert-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss" type="button">
          ✕
        </button>
      )}
    </div>
  );
}
