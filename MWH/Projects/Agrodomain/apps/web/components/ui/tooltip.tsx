"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  children: ReactNode;
}

const posClass: Record<TooltipPosition, string> = {
  top: "ds-tooltip-top",
  bottom: "ds-tooltip-bottom",
  left: "ds-tooltip-left",
  right: "ds-tooltip-right",
};

export function Tooltip({ content, position = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="ds-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className={clsx("ds-tooltip", posClass[position])} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
