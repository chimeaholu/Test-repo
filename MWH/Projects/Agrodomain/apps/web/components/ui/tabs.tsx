"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ items, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id ?? "");

  return (
    <div className={className}>
      <div className="ds-tabs-list" role="tablist">
        {items.map((tab) => (
          <button
            key={tab.id}
            className="ds-tab"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {items.map((tab) =>
        active === tab.id ? (
          <div
            key={tab.id}
            className="ds-tab-panel"
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
          >
            {tab.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
