"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { clsx } from "clsx";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((variant: ToastVariant, message: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, variant, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="ds-toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={clsx("ds-toast", `ds-toast-${t.variant}`)} role="status">
              <div className="ds-toast-content">{t.message}</div>
              <button className="ds-toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss" type="button">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
