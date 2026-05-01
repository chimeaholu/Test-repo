"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AgroIntelligenceEntityDetail } from "@agrodomain/contracts";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/app-provider";
import {
  EmptyState,
  InfoList,
  SectionHeading,
  StatusPill,
  SurfaceCard,
} from "@/components/ui-primitives";
import { agroIntelligenceApi } from "@/lib/api/agro-intelligence";
import { responseEnvelope } from "@/lib/api-client";
import { useApiQuery } from "@/lib/hooks/use-api-query";
import { AgroIntelligenceShell } from "./agro-intelligence-shell";
import {
  buildEntityBadges,
  getWorkspaceBuckets,
  humanizeQueueReason,
  isOperatorRole,
} from "./model";

export function AgroIntelligenceWorkspacePage() {
  const { session, traceId } = useAppState();
  const [activeBucket, setActiveBucket] = useState("all");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [busyEntityId, setBusyEntityId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const queueQuery = useApiQuery(
    () => agroIntelligenceApi.getVerificationQueue(traceId),
    [traceId],
  );
  const detailQuery = useApiQuery<AgroIntelligenceEntityDetail | null>(
    () =>
      selectedEntityId
        ? agroIntelligenceApi.getEntity(selectedEntityId, traceId)
        : Promise.resolve(responseEnvelope<AgroIntelligenceEntityDetail | null>(null, traceId)),
    [selectedEntityId, traceId],
  );

  useEffect(() => {
    if (queueQuery.data?.items.length && !selectedEntityId) {
      setSelectedEntityId(queueQuery.data.items[0]?.entity_id ?? null);
    }
  }, [queueQuery.data, selectedEntityId]);

  if (!session) {
    return null;
  }

  if (!isOperatorRole(session.actor.role)) {
      return (
      <AgroIntelligenceShell
        description="The verification queue is reserved for internal operators who can approve, reject, or mark stale graph records."
        title="Internal verification workspace"
        queueCount={0}
      >
        <SurfaceCard>
          <EmptyState
            title="Operator access required"
            body="Buyer-facing roles can inspect profiles and relationship detail, but queue decisions stay inside the internal workspace."
          />
        </SurfaceCard>
      </AgroIntelligenceShell>
    );
  }

  const buckets = getWorkspaceBuckets(queueQuery.data);
  const selectedBucket =
    buckets.find((bucket) => bucket.id === activeBucket) ?? buckets[0];
  const selectedEntity =
    selectedBucket?.items.find((item) => item.entity_id === selectedEntityId) ??
    selectedBucket?.items[0] ??
    null;
  const detail = detailQuery.data;

  const runDecision = (entityId: string, action: "approve" | "reject" | "mark_stale") => {
    setBusyEntityId(entityId);
    void agroIntelligenceApi
      .applyVerificationDecision({ action, entityId, traceId })
      .then(() => queueQuery.refetch())
      .finally(() => setBusyEntityId(null));
  };

  return (
    <AgroIntelligenceShell
      description="Use this internal queue to confirm, reject, or hold records before they appear more confidently in the product."
      title="Review records that still need operator judgment"
      queueCount={queueQuery.data?.count ?? 0}
      actions={
        <Button
          loading={syncing}
          onClick={() => {
            setSyncing(true);
            void agroIntelligenceApi
              .runResolution(traceId)
              .then(() => queueQuery.refetch())
              .finally(() => setSyncing(false));
          }}
          size="md"
          variant="primary"
        >
          Refresh records
        </Button>
      }
    >
      {queueQuery.error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {queueQuery.error.message}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Review buckets"
          title="Work the review queue without dropping context"
          body="Use the buckets below to move through duplicates, stale records, imported claims, and other records that still need operator judgment."
        />
        <div className="agro-workspace-tabs" role="tablist" aria-label="Verification queue views">
          {buckets.map((bucket) => (
            <button
              aria-selected={activeBucket === bucket.id}
              className="ds-tab"
              key={bucket.id}
              onClick={() => {
                setActiveBucket(bucket.id);
                setSelectedEntityId(bucket.items[0]?.entity_id ?? null);
              }}
              role="tab"
              type="button"
            >
              {bucket.label} ({bucket.items.length})
            </button>
          ))}
        </div>
      </SurfaceCard>

      {selectedBucket && selectedBucket.items.length > 0 ? (
        <div className="agro-workspace-grid">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Review buckets"
              title={selectedBucket.label}
              body="Pick a record on the left, inspect the selected record on the right, then take a reversible action."
            />
            <div className="agro-review-stack">
              {selectedBucket.items.map((item) => (
                <button
                  className={`agro-review-item${selectedEntity?.entity_id === item.entity_id ? " is-selected" : ""}`}
                  key={item.entity_id}
                  onClick={() => setSelectedEntityId(item.entity_id)}
                  type="button"
                >
                  <div className="agro-review-item-head">
                    <div className="stack-sm">
                      <strong>{item.canonical_name}</strong>
                      <span className="muted">
                        {item.entity_type.replaceAll("_", " ")} · {item.country_code}
                      </span>
                    </div>
                    <StatusPill tone={item.freshness_status === "fresh" ? "online" : item.freshness_status === "watch" ? "neutral" : "degraded"}>
                      {item.priority_score}
                    </StatusPill>
                  </div>
                  <p className="muted">
                    {item.reasons.map((reason) => humanizeQueueReason(reason)).join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
              eyebrow="Selected record"
              title={selectedEntity?.canonical_name ?? "Select a record"}
              body="The preview keeps the issue, supporting sources, and operator actions in the same place."
            />
            {detail ? (
              <div className="stack-md">
                <div className="pill-row">
                  {buildEntityBadges(detail).map((badge) => (
                    <StatusPill key={`${detail.entity_id}-${badge.label}`} tone={badge.tone}>
                      {badge.label}
                    </StatusPill>
                  ))}
                </div>
                <InfoList
                  items={[
                    { label: "Confidence", value: detail.confidence_score },
                    { label: "Freshness", value: detail.freshness_status },
                    { label: "Pending claims", value: detail.pending_claim_count },
                    { label: "Evidence", value: detail.source_document_count },
                  ]}
                />
                <div className="stack-sm">
                  <strong>Why this is here</strong>
                  <p className="muted">
                    {(selectedEntity?.reasons ?? [])
                      .map((reason) => humanizeQueueReason(reason))
                      .join(", ")}
                  </p>
                </div>
                <div className="stack-sm">
                  <strong>Supporting sources</strong>
                  {detail.source_documents.length > 0 ? (
                    detail.source_documents.map((document) => (
                      <article className="agro-evidence-card" key={document.document_id}>
                        <div className="agro-evidence-head">
                          <strong>{document.title}</strong>
                          <StatusPill tone={document.source_tier === "A" ? "online" : document.source_tier === "B" ? "neutral" : "degraded"}>
                            Tier {document.source_tier}
                          </StatusPill>
                        </div>
                        <p className="muted">
                          {document.partner_slug || "public source"} · {document.collected_at}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="muted">No supporting source records are visible for this entity yet.</p>
                  )}
                </div>
                <div className="inline-actions">
                  <Button
                    disabled={busyEntityId === detail.entity_id}
                    onClick={() => runDecision(detail.entity_id, "approve")}
                    size="sm"
                    variant="secondary"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={busyEntityId === detail.entity_id}
                    onClick={() => runDecision(detail.entity_id, "reject")}
                    size="sm"
                    variant="danger"
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={busyEntityId === detail.entity_id}
                    onClick={() => runDecision(detail.entity_id, "mark_stale")}
                    size="sm"
                    variant="ghost"
                  >
                    Mark for later review
                  </Button>
                  <Link href={`/app/agro-intelligence/graph/${detail.entity_id}`}>Open related profile</Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Select a queue item"
                body="The preview panel will show the issue, supporting sources, and actions for the record you choose."
              />
            )}
          </SurfaceCard>
        </div>
      ) : (
        <SurfaceCard>
          <EmptyState
            title="No records need review right now"
            body="Run another refresh after new inbound records land, or come back when verification drift pushes entities back into the queue."
          />
        </SurfaceCard>
      )}
    </AgroIntelligenceShell>
  );
}
