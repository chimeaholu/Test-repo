"use client";

import React from "react";
import type { ReactNode } from "react";

export function ChartCard(props: {
  actions?: ReactNode;
  body?: string;
  children: ReactNode;
  eyebrow?: string;
  title: string;
  testId?: string;
}) {
  return (
    <section className="surface-card analytics-chart-card" data-testid={props.testId}>
      <header className="section-heading analytics-chart-heading">
        <div className="stack-sm">
          {props.eyebrow ? <p className="eyebrow">{props.eyebrow}</p> : null}
          <div className="stack-sm">
            <h3>{props.title}</h3>
            {props.body ? <p className="muted">{props.body}</p> : null}
          </div>
        </div>
        {props.actions ? <div className="inline-actions">{props.actions}</div> : null}
      </header>
      {props.children}
    </section>
  );
}
