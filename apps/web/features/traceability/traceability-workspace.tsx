"use client";

import type { Consignment, EvidenceAttachment, TraceabilityEvent } from "@agrodomain/contracts";
import React, { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { ErrorState, InfoList, InsightCallout, LoadingState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  buildEvidenceGallery,
  evidenceValidationTone,
  sortTimeline,
  timelineContinuityWarnings,
  traceabilityMilestoneTone,
} from "@/features/traceability/model";
import { agroApiClient } from "@/lib/api/mock-client";
import { recordTelemetry } from "@/lib/telemetry/client";

export function TraceabilityWorkspace({ consignmentId }: { consignmentId: string }) {
  const { session, traceId } = useAppState();
  const [consignment, setConsignment] = useState<Consignment | null>(null);
  const [timeline, setTimeline] = useState<TraceabilityEvent[]>([]);
  const [attachments, setAttachments] = useState<EvidenceAttachment[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void agroApiClient
      .getConsignmentDetail(consignmentId, traceId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const orderedTimeline = sortTimeline(response.data.timeline);
        setConsignment(response.data.consignment);
        setTimeline(orderedTimeline);
        setAttachments(response.data.evidence_attachments);
        setAttachmentErrors(response.data.evidence_attachment_errors);
        setActiveEventId(orderedTimeline[0]?.trace_event_id ?? null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load traceability timeline.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [consignmentId, session, traceId]);

  const activeEvent = timeline.find((item) => item.trace_event_id === activeEventId) ?? timeline[0] ?? null;
  const continuityWarnings = useMemo(() => timelineContinuityWarnings(timeline), [timeline]);
  const evidenceGallery = useMemo(
    () => (consignment ? buildEvidenceGallery(attachments, consignment, timeline) : { valid: [], errors: [] }),
    [attachments, consignment, timeline],
  );
  const activeEvidence = evidenceGallery.valid.find((item) => item.evidence_attachment_id === activeEvidenceId) ?? null;

  useEffect(() => {
    if (!activeEvent) {
      return;
    }
    recordTelemetry({
      event: "traceability_event_detail_opened",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        trace_event_id: activeEvent.trace_event_id,
        order_index: activeEvent.order_index,
      },
    });
  }, [activeEvent?.trace_event_id, activeEvent?.order_index, traceId]);

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Traceability timeline"
          title={`Consignment ${consignmentId}`}
          body="Milestone order, custody status, and evidence availability stay explicit across mobile and desktop layouts."
          actions={
            <div className="pill-row">
              <StatusPill tone={continuityWarnings.length === 0 ? "online" : "offline"}>
                {continuityWarnings.length === 0 ? "Continuity verified" : "Continuity warning"}
              </StatusPill>
              <StatusPill tone="neutral">{timeline.length} event(s)</StatusPill>
            </div>
          }
        />
      </SurfaceCard>

      {loading ? <LoadingState label="Loading consignment history and evidence..." /> : null}

      {error ? <ErrorState title="Traceability could not be loaded" body={error} /> : null}

      {consignment && !loading ? (
        <div className="climate-layout">
          <SurfaceCard>
              <SectionHeading
                eyebrow="Timeline"
                title="Ordered event chain"
                body="Each event keeps its reference, predecessor, and timestamp visible so the chain is easy to verify."
              />
            <div className="advisory-thread-list" role="list" aria-label="Traceability events">
              {timeline.map((event) => (
                <button
                  key={event.trace_event_id}
                  className={`thread-list-item advisory-list-item${event.trace_event_id === activeEvent?.trace_event_id ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveEventId(event.trace_event_id)}
                >
                  <div className="queue-head">
                    <div className="pill-row">
                      <StatusPill tone={traceabilityMilestoneTone(event.milestone)}>{event.milestone}</StatusPill>
                      <StatusPill tone="neutral">#{event.order_index}</StatusPill>
                    </div>
                    <span className="muted">{new Date(event.occurred_at).toLocaleString()}</span>
                  </div>
                  <h3>{event.event_reference}</h3>
                  <p className="muted">Actor: {event.actor_id}</p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="content-stack">
            {activeEvent ? (
              <SurfaceCard>
                <SectionHeading
                  eyebrow={activeEvent.milestone}
                  title="Event details"
                  body="Actor, custody, and chain references remain attached to every timeline event."
                />
                <InfoList
                  items={[
                    { label: "Trace event id", value: activeEvent.trace_event_id },
                    { label: "Event reference", value: activeEvent.event_reference },
                    { label: "Previous reference", value: activeEvent.previous_event_reference ?? "None (chain start)" },
                    { label: "Actor role", value: activeEvent.actor_role },
                    { label: "Current custody", value: consignment.current_custody_actor_id ?? "Not recorded" },
                    { label: "Status", value: consignment.status },
                  ]}
                />
              </SurfaceCard>
            ) : null}

            <SurfaceCard>
              <SectionHeading
                eyebrow="Quality evidence"
                title="Evidence and validation status"
                body="Evidence stays tied to specific trace events, and invalid or orphaned metadata is surfaced as a visible exception."
              />
              {attachments.length === 0 ? (
                <InsightCallout
                  title="No evidence attachment metadata returned"
                  body="This consignment does not currently include attachment metadata. The gallery cannot infer evidence from timeline events alone."
                  tone="accent"
                />
              ) : null}
              {attachmentErrors.length > 0 || evidenceGallery.errors.length > 0 || continuityWarnings.length > 0 ? (
                <div className="stack-sm">
                  {[...attachmentErrors, ...evidenceGallery.errors, ...continuityWarnings].map((warning) => (
                    <p key={warning} className="field-error" role="alert">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
              {evidenceGallery.valid.length > 0 ? (
                <div className="stack-md">
                  {evidenceGallery.valid.map((item) => (
                    <button
                      className="queue-item button-reset"
                      key={item.evidence_attachment_id}
                      type="button"
                      onClick={() => {
                        setActiveEvidenceId(item.evidence_attachment_id);
                        recordTelemetry({
                          event: "traceability_evidence_gallery_opened",
                          trace_id: traceId,
                          timestamp: new Date().toISOString(),
                          detail: {
                            evidence_attachment_id: item.evidence_attachment_id,
                            validation_state: item.validation_state,
                          },
                        });
                      }}
                    >
                      <div className="queue-head">
                        <strong>{item.file_name}</strong>
                        <StatusPill tone={evidenceValidationTone(item.validation_state)}>{item.validation_state}</StatusPill>
                      </div>
                      <p className="muted">
                        Event: {item.trace_event_id} • {new Date(item.captured_at).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
              {activeEvidence ? (
                <InfoList
                  items={[
                    { label: "Attachment id", value: activeEvidence.evidence_attachment_id },
                    { label: "Media type", value: activeEvidence.media_type },
                    { label: "Validation state", value: activeEvidence.validation_state },
                    { label: "Checksum", value: activeEvidence.checksum_sha256 },
                    { label: "Storage URL", value: activeEvidence.storage_url },
                  ]}
                />
              ) : null}
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
