import React, { type ReactNode } from "react";
import { clsx } from "clsx";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx("ds-page-header", className)}>
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      <div className="ds-page-header-row">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  );
}
