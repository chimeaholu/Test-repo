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
          <strong>Need more guidance?</strong>
          <Link className="button-ghost weather-inline-action" href="/app/advisory/new">
            Ask AgroGuide
          </Link>
        </div>
        <p className="muted">
          {props.advisoryContext
            ? `${props.advisoryContext.topic}: ${props.advisoryContext.response}`
            : "If the forecast changes or the field looks different on the ground, send the situation into AgroGuide and keep the guidance attached to this weather view."}
        </p>
      </article>
    </section>
  );
}
