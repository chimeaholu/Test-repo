import Link from "next/link";
import { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  kind?: "primary" | "secondary" | "ghost";
};

export function Button({ children, href, kind = "primary" }: ButtonProps) {
  const className = `button button-${kind}`;

  if (href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  return <button className={className}>{children}</button>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: { label: string; value: string; change: string }[];
}) {
  return (
    <div className="metric-grid" role="list" aria-label="Key metrics">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label} role="listitem">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.change}</small>
        </article>
      ))}
    </div>
  );
}

export function QueueList({
  items,
}: {
  items: {
    id: string;
    title: string;
    detail: string;
    priority: "urgent" | "today" | "planned";
    proof?: string;
  }[];
}) {
  return (
    <div className="queue-list" role="list" aria-label="Action queue">
      {items.map((item) => (
        <article className="queue-item" key={item.id} role="listitem">
          <div className="queue-item-head">
            <Badge
              tone={
                item.priority === "urgent"
                  ? "danger"
                  : item.priority === "today"
                    ? "warning"
                    : "info"
              }
            >
              {item.priority}
            </Badge>
            <h3>{item.title}</h3>
          </div>
          <p>{item.detail}</p>
          {item.proof ? <small>{item.proof}</small> : null}
        </article>
      ))}
    </div>
  );
}

export function ProofList({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <dl className="proof-list">
      {items.map((item) => (
        <div className="proof-row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageIntro({
  title,
  summary,
  eyebrow,
  actions,
}: {
  title: string;
  summary: string;
  eyebrow: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="page-intro-copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{summary}</p>
      </div>
      {actions ? <div className="page-intro-actions">{actions}</div> : null}
    </section>
  );
}
