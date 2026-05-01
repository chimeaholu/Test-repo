"use client";

import Link from "next/link";

import { useAppState } from "@/components/app-provider";
import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { queueSummary } from "@/lib/offline/reducer";
import { queueItemSummary, queueStateLabel } from "@/lib/offline/policy";

export default function OutboxPage() {
  const { cachedReadModels, dismissQueueItem, queue, retryQueueItem } = useAppState();
  const summary = queueSummary(queue.items);
  const activeItems = queue.items.filter((item) => item.state !== "cancelled");

  return (
    <>
      <SurfaceCard>
        <SectionHeading
          eyebrow="Saved work"
          title="See what is waiting to sync"
          body="Review offline changes, retry the ones that are ready, and open details only when something needs a closer look."
        />
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Waiting for signal"
            title="Needs review"
            body="Retry the items that are ready, then open any issue that still needs a manual decision."
          />
          {activeItems.length === 0 ? (
            <p className="muted">No deferred work is waiting. Draft-safe actions will appear here when they are saved offline.</p>
          ) : (
            <ul className="queue-list">
              {activeItems.map((item) => (
                <li className="queue-item" key={item.item_id}>
                  <div className="queue-head">
                    <strong>{queueItemSummary(item)}</strong>
                    <StatusPill tone={item.state === "acked" ? "online" : item.state === "conflicted" ? "offline" : "degraded"}>
                      {queueStateLabel(item)}
                    </StatusPill>
                  </div>
                  <p className="muted">
                    Saved {item.created_at} · Retry attempts {item.attempt_count}
                  </p>
                  {item.conflict_code ? (
                    <p className="field-error">Conflict code: {item.conflict_code}</p>
                  ) : null}
                  <div className="inline-actions">
                    <button className="button-primary" onClick={() => retryQueueItem(item.item_id)} type="button">
                      Try again
                    </button>
                    <button className="button-ghost" onClick={() => dismissQueueItem(item.item_id)} type="button">
                      Dismiss
                    </button>
                    {item.conflict_code ? (
                      <Link className="button-secondary" href={`/app/offline/conflicts/${item.item_id}`}>
                        Open details
                      </Link>
                    ) : null}
                  </div>
                  <details>
                    <summary>Advanced details</summary>
                    <p className="muted">
                      Workflow {item.workflow_id} · Intent <code>{item.intent}</code>
                    </p>
                    <p className="muted">
                      Idempotency <code>{item.idempotency_key}</code>
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </article>

        <aside className="queue-card">
          <SectionHeading eyebrow="Advanced details" title="Sync health" />
          <InfoList
            items={[
              { label: "Connectivity", value: queue.connectivity_state },
              { label: "Actionable items", value: summary.actionableCount },
              { label: "Conflicts", value: summary.conflictedCount },
              { label: "Cached reads", value: cachedReadModels.length },
              { label: "Suggested handoff", value: queue.handoff_channel ?? "none" },
            ]}
          />
          <div className="stack-sm" style={{ marginTop: "1rem" }}>
            <SectionHeading
              eyebrow="Recent trusted views"
              title="Cached views available offline"
              body="These views stay visible when you lose signal, with freshness kept clear."
            />
            {cachedReadModels.length === 0 ? (
              <p className="muted">No cached server views are available yet.</p>
            ) : (
              <ul className="queue-list">
                {cachedReadModels.map((item) => (
                  <li className="queue-item" key={`${item.cacheKey}:${item.path}`}>
                    <div className="queue-head">
                      <strong>{item.label}</strong>
                      <StatusPill tone={item.state === "synced" ? "online" : item.state === "stale" ? "offline" : "degraded"}>
                        {item.state}
                      </StatusPill>
                    </div>
                    <p className="muted">{item.module}</p>
                    <p className="muted">Cached {item.cachedAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
