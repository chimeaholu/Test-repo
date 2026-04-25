import Link from "next/link";
import React from "react";
import type { ReactNode } from "react";

export function SurfaceCard(props: {
  className?: string;
  children: ReactNode;
}) {
  const { children, className, ...rest } = props as typeof props & React.ComponentPropsWithoutRef<"section">;
  return (
    <section className={["surface-card", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </section>
  );
}

export function SectionHeading(props: {
  eyebrow?: string;
  title: string;
  body?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="section-heading">
      <div className="stack-sm">
        {props.eyebrow ? <p className="eyebrow">{props.eyebrow}</p> : null}
        <h2>{props.title}</h2>
        {props.body ? <p className="muted measure">{props.body}</p> : null}
      </div>
      {props.actions ? <div className="inline-actions">{props.actions}</div> : null}
    </header>
  );
}

export function StatusPill(props: {
  tone: "online" | "offline" | "degraded" | "neutral";
  children: ReactNode;
}) {
  return <span className={`status-pill ${props.tone}`}>{props.children}</span>;
}

export function ActionLink(props: {
  href: string;
  label: string;
  tone?: "primary" | "secondary" | "ghost";
}) {
  const tone = props.tone ?? "primary";
  const className =
    tone === "primary" ? "button-primary" : tone === "secondary" ? "button-secondary" : "button-ghost";
  return (
    <Link className={className} href={props.href}>
      {props.label}
    </Link>
  );
}

export function InfoList(props: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <ul className="info-list">
      {props.items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

export function InsightCallout(props: {
  title: string;
  body: string;
  tone?: "brand" | "accent" | "neutral";
}) {
  return (
    <aside className={`insight-callout ${props.tone ?? "neutral"}`}>
      <strong>{props.title}</strong>
      <p className="muted">{props.body}</p>
    </aside>
  );
}

export function EmptyState(props: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <section className="empty-state" role="status">
      <strong>{props.title}</strong>
      <p className="muted">{props.body}</p>
      {props.actions ? <div className="inline-actions">{props.actions}</div> : null}
    </section>
  );
}
