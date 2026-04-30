"use client";

import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  advisoryStatusTone,
  confidenceTone,
  resolveAdvisoryLocale,
  sortAdvisoryItems,
  type AdvisoryViewModel,
} from "@/features/advisory/model";
import { advisoryApi } from "@/lib/api/advisory";
import { sendCommand } from "@/lib/api-client";
import { auditApi } from "@/lib/api/audit";
import { advisoryCopyByLocale, resolveExperienceLocale } from "@/lib/content/route-copy";
import { recordTelemetry } from "@/lib/telemetry/client";

type SubmitFormState = {
  location: string;
  topic: string;
  questionText: string;
};

type SubmitEvidence = {
  requestId: string;
  idempotencyKey: string;
  auditEventCount: number;
  replayed: boolean;
} | null;

function humanizeAdvisoryStatus(status: AdvisoryViewModel["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "delivered":
      return "Sent";
    case "hitl_required":
      return "Needs review";
    case "revised":
      return "Revised";
    case "blocked":
      return "On hold";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function humanizeConfidenceBand(confidenceBand: AdvisoryViewModel["confidence_band"]): string {
  if (confidenceBand === "high") {
    return "Strong fit";
  }
  if (confidenceBand === "medium") {
    return "Check before sending";
  }
  return "Limited confidence";
}

function reviewHeadline(item: AdvisoryViewModel): string {
  if (!item.reviewer_decision) {
    return "Ready to share";
  }

  switch (item.reviewer_decision.outcome) {
    case "approve":
      return "Ready to send";
    case "revise":
      return "Needs a closer review";
    case "block":
      return "Hold this answer for now";
    case "hitl_required":
      return "A person still needs to confirm this";
  }
}

function reviewBody(item: AdvisoryViewModel): string {
  if (!item.reviewer_decision) {
    return "The latest guidance is ready to use, with the source detail still available if you want to double-check it.";
  }

  if (item.reviewer_decision.note) {
    return item.reviewer_decision.note;
  }

  switch (item.reviewer_decision.outcome) {
    case "approve":
      return "The guidance is ready to share with the current supporting sources attached.";
    case "revise":
      return "The guidance needs another pass before it should be shared more widely.";
    case "block":
      return "The guidance should stay on hold until the supporting detail improves.";
    case "hitl_required":
      return "A person needs to confirm the next step before this answer should be treated as field-ready guidance.";
  }
}

export function AdvisoryConversationWorkspace(props: { surface: "advisor" | "requester" }) {
  const { session, traceId } = useAppState();
  const localeState = resolveAdvisoryLocale(session?.actor.locale);
  const experienceLocale = resolveExperienceLocale(localeState.resolvedLocale);
  const copy = advisoryCopyByLocale[experienceLocale];
  const [items, setItems] = useState<AdvisoryViewModel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<"live" | "fallback">("fallback");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitForm, setSubmitForm] = useState<SubmitFormState>({
    location: "",
    topic: "",
    questionText: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitEvidence, setSubmitEvidence] = useState<SubmitEvidence>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void advisoryApi
      .listConversations(traceId, localeState.resolvedLocale)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const sortedItems = sortAdvisoryItems(response.data.items);
        setItems(sortedItems);
        setActiveId(sortedItems[0]?.advisory_request_id ?? null);
        setRuntimeMode(response.data.runtime_mode);
        setError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load advisory conversation.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localeState.resolvedLocale, refreshKey, session, traceId]);

  const activeItem = items.find((item) => item.advisory_request_id === activeId) ?? items[0] ?? null;

  useEffect(() => {
    if (!activeItem) {
      return;
    }
    recordTelemetry({
      event: "advisory_reviewer_state_visible",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        advisory_request_id: activeItem.advisory_request_id,
        reviewer_outcome: activeItem.reviewer_decision.outcome,
        confidence_band: activeItem.confidence_band,
      },
    });
  }, [activeItem, traceId]);

  function toggleDrawer(): void {
    const nextState = !drawerOpen;
    setDrawerOpen(nextState);
    if (nextState && activeItem) {
      recordTelemetry({
        event: "advisory_citation_drawer_opened",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          advisory_request_id: activeItem.advisory_request_id,
          citation_count: activeItem.citations.length,
        },
      });
    }
  }

  async function submitAdvisoryRequest(): Promise<void> {
    if (!session || isSubmitting) return;
    if (submitForm.topic.length < 3 || submitForm.questionText.length < 12) {
      setError("Topic must be at least 3 characters and question at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitEvidence(null);
    try {
      const questionText = submitForm.location.trim()
        ? `${submitForm.questionText.trim()}\nLocation: ${submitForm.location.trim()}`
        : submitForm.questionText.trim();
      const result = await sendCommand(
        {
          actorId: session.actor.actor_id,
          countryCode: session.actor.country_code,
          commandName: "advisory.requests.submit",
          aggregateRef: "advisory",
          mutationScope: "advisory.requests",
          journeyIds: ["CJ-005"],
          dataCheckIds: ["DI-005"],
          input: {
            topic: submitForm.topic.trim(),
            question_text: questionText,
            locale: localeState.resolvedLocale,
            transcript_entries: [],
            policy_context: { sensitive_topics: [] },
          },
          traceId,
        },
        traceId,
      );

      const auditEvents = await auditApi.getEvents(
        result.data.request_id,
        result.data.idempotency_key,
        traceId,
      );

      setSubmitEvidence({
        requestId: result.data.request_id,
        idempotencyKey: result.data.idempotency_key,
        auditEventCount: Array.isArray(auditEvents.data) ? auditEvents.data.length : 0,
        replayed: result.data.replayed,
      });

      recordTelemetry({
        event: "advisory_request_submitted",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          topic: submitForm.topic.trim(),
          request_id: result.data.request_id,
          replayed: result.data.replayed,
        },
      });

      setSubmitForm({ location: "", topic: "", questionText: "" });
      setRefreshKey((k) => k + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit advisory request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) {
    return null;
  }

  const heroCopy =
    props.surface === "advisor"
      ? {
          body: "Keep the farmer's question, the recommended response, and the supporting context in one place.",
          eyebrow: "AgroGuide requests",
          title: "Review the next request and send practical guidance",
        }
      : {
          body: "Use clear, practical language so the platform can return the most helpful response.",
          eyebrow: "Ask AgroGuide",
          title: "Describe the issue and get grounded guidance",
        };

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow={heroCopy.eyebrow}
          title={heroCopy.title}
          body={heroCopy.body}
          actions={
            <div className="pill-row">
              <StatusPill tone={runtimeMode === "live" ? "online" : "degraded"}>
                {runtimeMode === "live" ? "Live updates" : "Saved reference view"}
              </StatusPill>
              <StatusPill tone="neutral">{localeState.resolvedLocale}</StatusPill>
            </div>
          }
        />
        <div className="stack-sm">
          {localeState.usedFallback ? <p className="muted">{copy.localeFallback}</p> : null}
          <p className="muted">{runtimeMode === "live" ? copy.runtimeLive : copy.runtimeFallback}</p>
          <p className="muted">
            {props.surface === "advisor"
              ? "Requests waiting, the recommended guidance, the supporting sources, and the review note stay visible together."
              : "Describe the crop issue clearly, then review the latest guidance, supporting sources, and any review note in the same place."}
          </p>
        </div>
      </SurfaceCard>

      {props.surface === "requester" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="New guidance request"
            title="Ask AgroGuide"
            body="Describe the crop issue in plain language so the platform can return grounded guidance and keep the next review step clear."
          />
          <div className="stack-sm advisory-request-form">
            <label className="field-label" htmlFor="advisory-topic">
              What do you need help with?
              <input
                className="field-input"
                id="advisory-topic"
                maxLength={120}
                minLength={3}
                onChange={(e) => setSubmitForm((prev) => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g. soil moisture planning"
                type="text"
                value={submitForm.topic}
              />
            </label>
            <label className="field-label" htmlFor="advisory-location">
              Where is this happening?
              <input
                className="field-input"
                id="advisory-location"
                maxLength={160}
                onChange={(e) => setSubmitForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="District, region, or village"
                type="text"
                value={submitForm.location}
              />
            </label>
            <label className="field-label" htmlFor="advisory-question">
              What have you observed so far?
              <textarea
                className="field-input"
                id="advisory-question"
                maxLength={2000}
                minLength={12}
                onChange={(e) => setSubmitForm((prev) => ({ ...prev, questionText: e.target.value }))}
                placeholder="Include the crop, the main symptom, and what changed recently if you know it."
                rows={4}
                value={submitForm.questionText}
              />
            </label>
            <p className="muted">
              Include the crop, the main symptom, and what changed recently if you know it.
            </p>
            <div className="actions-row">
              <button
                className="button-primary"
                disabled={isSubmitting || submitForm.topic.length < 3 || submitForm.questionText.length < 12}
                onClick={() => void submitAdvisoryRequest()}
                type="button"
              >
                {isSubmitting ? "Saving request..." : "Request guidance"}
              </button>
            </div>
          </div>
          {submitEvidence ? (
            <div className="stack-sm">
              <InsightCallout
                title="Guidance request saved"
                body="Your request is now in the queue with its supporting history attached so the next answer and review note stay together."
                tone="brand"
              />
              <p className="muted">
                Reference {submitEvidence.requestId} · {submitEvidence.auditEventCount} recorded step
                {submitEvidence.auditEventCount === 1 ? "" : "s"}
                {submitEvidence.replayed ? " · replay protected" : ""}
              </p>
            </div>
          ) : null}
        </SurfaceCard>
      ) : null}

      {isLoading ? (
        <SurfaceCard>
          <p className="muted" role="status">
            {copy.loadingCopy}
          </p>
        </SurfaceCard>
      ) : null}

      {error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {error}
          </p>
        </SurfaceCard>
      ) : null}

      {!isLoading && !activeItem ? (
        <SurfaceCard>
          <p className="muted">{copy.emptyCopy}</p>
        </SurfaceCard>
      ) : null}

      {!isLoading && activeItem ? (
        <div className="advisory-layout">
          <SurfaceCard>
            <SectionHeading
              eyebrow={props.surface === "advisor" ? "Requests waiting" : "Recent guidance"}
              title={props.surface === "advisor" ? "Open the next request" : "Review the latest guidance"}
              body="Open a request to read the recommended guidance, check the supporting sources, and decide whether it is ready to send."
            />
            <div className="advisory-thread-list" role="list" aria-label="Advisory requests">
              {items.map((item) => (
                <button
                  className={`thread-list-item advisory-list-item${
                    item.advisory_request_id === activeItem.advisory_request_id ? " is-active" : ""
                  }`}
                  key={item.advisory_request_id}
                  onClick={() => setActiveId(item.advisory_request_id)}
                  type="button"
                >
                  <div className="queue-head">
                    <div className="pill-row">
                      <StatusPill tone={advisoryStatusTone(item.status)}>{humanizeAdvisoryStatus(item.status)}</StatusPill>
                      <StatusPill tone={confidenceTone(item.confidence_band)}>
                        {humanizeConfidenceBand(item.confidence_band)}
                      </StatusPill>
                    </div>
                    <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <h3>{item.topic}</h3>
                  <p className="muted">{item.question_text}</p>
                  <p className="muted">
                    {item.citations.length} supporting source{item.citations.length === 1 ? "" : "s"} · {reviewHeadline(item)}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="content-stack">
            <SurfaceCard>
              <SectionHeading
                eyebrow={activeItem.topic}
                title="Recommended guidance"
                body={activeItem.question_text}
                actions={
                  <div className="pill-row">
                    <StatusPill tone={advisoryStatusTone(activeItem.status)}>
                      {humanizeAdvisoryStatus(activeItem.status)}
                    </StatusPill>
                    <StatusPill tone={confidenceTone(activeItem.confidence_band)}>
                      {Math.round(activeItem.confidence_score * 100)}% ready
                    </StatusPill>
                  </div>
                }
              />
              <p>{activeItem.response_text}</p>
              {activeItem.status === "blocked" ? (
                <InsightCallout title="Keep this answer on hold" body={copy.blockedCopy} tone="accent" />
              ) : null}
              {activeItem.status === "hitl_required" ? (
                <InsightCallout title="Needs closer review" body={copy.hitlCopy} tone="brand" />
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={copy.reviewerLabel}
                title={reviewHeadline(activeItem)}
                body={reviewBody(activeItem)}
              />
              {activeItem.reviewer_decision ? (
                <ul className="info-list">
                  <li>
                    <span>Decision</span>
                    <strong>{activeItem.reviewer_decision.outcome.replaceAll("_", " ")}</strong>
                  </li>
                  <li>
                    <span>Review threshold</span>
                    <strong>
                      {Math.round(activeItem.reviewer_decision.policy_context.confidence_threshold * 100)}%
                    </strong>
                  </li>
                  <li>
                    <span>Sensitivity</span>
                    <strong>
                      {activeItem.reviewer_decision.policy_context.policy_sensitive
                        ? "Needs extra care"
                        : "Routine guidance"}
                    </strong>
                  </li>
                </ul>
              ) : (
                <p className="muted">
                  No extra review note is attached to this response. The source details and history are still available below.
                </p>
              )}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={copy.citationsLabel}
                title="Open the source details when you need them"
                body="The guidance stays attached to the source material that shaped the answer."
                actions={
                  <button className="button-ghost" onClick={toggleDrawer} type="button">
                    {drawerOpen ? "Hide source details" : "Open source details"}
                  </button>
                }
              />
              <p className="muted">
                {activeItem.citations.length} supporting source{activeItem.citations.length === 1 ? "" : "s"} linked
              </p>
              {drawerOpen ? (
                <div className="advisory-citations" role="list" aria-label="Citation drawer">
                  {activeItem.citations.map((citation) => (
                    <article className="queue-item" key={citation.source_id} role="listitem">
                      <div className="queue-head">
                        <strong>{citation.title}</strong>
                        <StatusPill tone="neutral">{citation.source_type}</StatusPill>
                      </div>
                      <p>{citation.excerpt}</p>
                      <p className="muted">
                        {citation.method_tag} · {citation.country_code} · {citation.locale}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={copy.transcriptLabel}
                title="Conversation history"
                body="Check the prompts and reply history that shaped the current guidance."
              />
              <ol className="timeline-list">
                {activeItem.transcript_entries.map((entry) => (
                  <li className="timeline-row" key={`${entry.captured_at}-${entry.speaker}`}>
                    <span className={`timeline-marker ${entry.speaker === "reviewer" ? "current" : "done"}`} />
                    <div className="stack-sm">
                      <div className="queue-head">
                        <strong>{entry.speaker}</strong>
                        <span className="muted">{new Date(entry.captured_at).toLocaleString()}</span>
                      </div>
                      <p>{entry.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
