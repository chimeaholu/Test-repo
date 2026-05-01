"use client";

import { useMemo } from "react";
import { Tooltip } from "@/components/ui/tooltip";

interface DateDisplayProps {
  date: string | Date;
  relative?: boolean;
  className?: string;
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
}

export function DateDisplay({ date, relative = true, className }: DateDisplayProps) {
  const d = useMemo(() => (date instanceof Date ? date : new Date(date)), [date]);
  const absolute = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const display = relative ? relativeTime(d) : absolute;

  return (
    <Tooltip content={absolute}>
      <time dateTime={d.toISOString()} className={className}>
        {display}
      </time>
    </Tooltip>
  );
}
