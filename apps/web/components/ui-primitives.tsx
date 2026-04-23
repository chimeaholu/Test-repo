import Link from "next/link";
import React from "react";
import type { ReactNode } from "react";

export function SurfaceCard(props: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={["surface-card", props.className].filter(Boolean).join(" ")}>{props.children}</section>;
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

export function LoadingSkeleton(props: { lines?: number }) {
  const count = props.lines ?? 3;
  return (
    <div className="loading-skeleton" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: i === count - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function LoadingState(props: { label: string; skeleton?: boolean; lines?: number }) {
  return (
    <SurfaceCard>
      <p className="muted state-message" role="status" aria-live="polite">
        {props.label}
      </p>
      {props.skeleton !== false ? <LoadingSkeleton lines={props.lines} /> : null}
    </SurfaceCard>
  );
}

export function EmptyState(props: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard>
      <div className="state-block">
        <strong className="state-title">{props.title}</strong>
        <p className="muted measure">{props.body}</p>
        {props.action ? <div className="actions-row">{props.action}</div> : null}
      </div>
    </SurfaceCard>
  );
}

export function ErrorState(props: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard>
      <div className="state-block">
        <strong className="state-title">{props.title}</strong>
        <p className="field-error" role="alert">
          {props.body}
        </p>
        {props.action ? <div className="actions-row">{props.action}</div> : null}
      </div>
    </SurfaceCard>
  );
}
