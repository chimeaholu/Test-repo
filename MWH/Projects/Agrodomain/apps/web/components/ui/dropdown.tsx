"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: (DropdownItem | "divider" | { header: string })[];
  className?: string;
}

export function Dropdown({ trigger, items, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={clsx("ds-dropdown-wrap", className)} ref={ref}>
      <span onClick={() => setOpen(!open)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}>
        {trigger}
      </span>
      {open && (
        <div className="ds-dropdown-menu" role="menu">
          {items.map((item, i) => {
            if (item === "divider") {
              return <div key={i} className="ds-dropdown-divider" role="separator" />;
            }
            if ("header" in item) {
              return <div key={i} className="ds-dropdown-header">{item.header}</div>;
            }
            return (
              <button
                key={i}
                className={clsx("ds-dropdown-item", item.danger && "ds-dropdown-item-danger")}
                role="menuitem"
                onClick={() => { item.onClick(); setOpen(false); }}
                type="button"
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
