import React from "react";

import Link from "next/link";

import { StatusPill } from "@/components/ui-primitives";
import type { CropAdviceItem } from "@/features/climate/model";

export function CropAdvice(props: {
  advisoryContext: { response: string; topic: string } | null;
  cropLabel: string;
  items: CropAdviceItem[];
}) {
  return (
    <section aria-label={`Weather advice for ${props.cropLabel}`} className="weather-advice-stack" role="region">
      {props.items.map((item) => (
        <article className="weather-advice-card" key={item.id}>
          <div className="queue-head">
            <strong>{item.title}</strong>
            <StatusPill tone={item.tone}>{item.tone}</StatusPill>
          </div>
          <p className="muted">{item.detail}</p>
        </article>
      ))}

      <article className="weather-advice-card weather-advice-context">
        <div className="queue-head">
          <strong>AgroGuide follow-through</strong>
          <Link className="button-ghost weather-inline-action" href="/app/advisory/new">
            Open AgroGuide
          </Link>
        </div>
        <p className="muted">
          {props.advisoryContext
            ? `${props.advisoryContext.topic}: ${props.advisoryContext.response}`
            : "Need a second opinion after the forecast changes? Send the field context into AgroGuide and keep the advisory transcript attached to the weather view."}
        </p>
      </article>
    </section>
  );
}
