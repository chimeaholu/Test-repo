"use client";

import React, { useEffect, useCallback, useRef, type ReactNode } from "react";
import { clsx } from "clsx";

type ModalSize = "sm" | "md" | "lg" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  footer?: ReactNode;
  children: ReactNode;
}

const sizeClass: Record<ModalSize, string> = {
  sm: "ds-modal-sm",
  md: "ds-modal-md",
  lg: "ds-modal-lg",
  full: "ds-modal-full",
};

export function Modal({ open, onClose, title, size = "md", footer, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusable?.[0];
    firstFocusable?.focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;

      const items = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleTabKey);
      document.body.style.overflow = "";
      previousActiveElementRef.current?.focus();
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={clsx("ds-modal", sizeClass[size])}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ds-modal-header">
            <h2>{title}</h2>
            <button className="ds-modal-close" onClick={onClose} aria-label="Close" type="button">
              ✕
            </button>
          </div>
        )}
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
