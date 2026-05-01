"use client";

import { useMemo } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDate, formatRelativeTime } from "@/lib/i18n/format";

interface DateDisplayProps {
  date: string | Date;
  locale?: string;
  relative?: boolean;
  className?: string;
}

export function DateDisplay({ date, locale, relative = true, className }: DateDisplayProps) {
  const d = useMemo(() => (date instanceof Date ? date : new Date(date)), [date]);
  const absolute = formatDate(d, { locale });
  const display = relative ? formatRelativeTime(d, { locale }) : absolute;

  return (
    <Tooltip content={absolute}>
      <time dateTime={d.toISOString()} className={className}>
        {display}
      </time>
    </Tooltip>
  );
}
