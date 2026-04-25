"use client";

import Link from "next/link";

import { useAppState } from "@/components/app-provider";
import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { queueSummary } from "@/lib/offline/reducer";

export default function OutboxPage() {
  const { dismissQueueItem, queue, retryQueueItem } = useAppState();
  const summary = queueSummary(queue.items);
  const activeItems = queue.items.filter((item) => item.state !== "cancelled");

  return (
    <>
      <SurfaceCard>
        <SectionHeading
          eyebrow="W-003 offline seam"
          title="Outbox and replay controls"
          body="Queued work stays in context, replay order stays deterministic, and each item exposes the envelope metadata the API transport will require."
        />
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Queued mutations"
            title="Actionable work"
            body="Resolve or replay items in order. Conflicts should surface guidance before retry."
          />
          <ul className="queue-list">
            {activeItems.map((item) => (
              <li className="queue-item" key={item.item_id}>
                <div className="queue-head">
                  <strong>{item.intent}</strong>
                  <StatusPill tone={item.state === "acked" ? "online" : item.state === "conflicted" ? "offline" : "degraded"}>
                    {item.state}
                  </StatusPill>
                </div>
                <p className="muted">
                  Workflow {item.workflow_id} · Attempts {item.attempt_count} · Created {item.created_at}
                </p>
                <p className="muted">
                  Idempotency key <code>{item.idempotency_key}</code>
                </p>
                {item.conflict_code ? (
                  <p className="field-error">Conflict code: {item.conflict_code}</p>
                ) : null}
                <div className="inline-actions">
                  <button className="button-primary" onClick={() => retryQueueItem(item.item_id)} type="button">
                    Retry
                  </button>
                  <button className="button-ghost" onClick={() => dismissQueueItem(item.item_id)} type="button">
                    Dismiss
                  </button>
                  {item.conflict_code ? (
                    <Link className="button-secondary" href={`/app/offline/conflicts/${item.item_id}`}>
                      View conflict
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </article>

        <aside className="queue-card">
          <SectionHeading eyebrow="Queue summary" title="Recovery posture" />
          <InfoList
            items={[
              { label: "Connectivity", value: queue.connectivity_state },
              { label: "Actionable items", value: summary.actionableCount },
              { label: "Conflicts", value: summary.conflictedCount },
              { label: "Suggested handoff", value: queue.handoff_channel ?? "none" },
            ]}
          />
        </aside>
      </div>
    </>
  );
}
