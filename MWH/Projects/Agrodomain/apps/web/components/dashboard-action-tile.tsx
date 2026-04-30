import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";

type DashboardActionTileTone = "primary" | "secondary" | "warning";

export function DashboardActionTile({
  detail,
  eyebrow,
  href,
  icon,
  label,
  tone = "primary",
}: {
  detail: string;
  eyebrow?: string;
  href: string;
  icon: ReactNode;
  label: string;
  tone?: DashboardActionTileTone;
}) {
  return (
    <Link className={`task-card task-card-icon ${tone}`} href={href}>
      <span aria-hidden="true" className="task-card-media">
        <span className="task-card-media-ring">{icon}</span>
      </span>
      <span className="task-card-content">
        {eyebrow ? <span className="task-card-eyebrow">{eyebrow}</span> : null}
        <strong>{label}</strong>
        <span className="muted">{detail}</span>
      </span>
      <span className="task-card-cta">Open</span>
    </Link>
  );
}
