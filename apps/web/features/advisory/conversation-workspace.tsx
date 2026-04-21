"use client";

import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  advisoryStatusTone,
  confidenceTone,
  resolveAdvisoryLocale,
  reviewerBody,
  reviewerHeadline,
  sortAdvisoryItems,
  type AdvisoryViewModel,
} from "@/features/advisory/model";
import { agroApiClient } from "@/lib/api/mock-client";
import { advisoryCopyByLocale, resolveExperienceLocale } from "@/lib/content/route-copy";
import { recordTelemetry } from "@/lib/telemetry/client";

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

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void agroApiClient
      .listAdvisoryConversations(traceId, localeState.resolvedLocale)
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
  }, [localeState.resolvedLocale, session, traceId]);

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

  if (!session) {
    return null;
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow={copy.historyEyebrow}
          title="Review evidence-backed recommendations"
          body={copy.historyBody}
          actions={
            <div className="pill-row">
              <StatusPill tone={runtimeMode === "live" ? "online" : "degraded"}>
                {runtimeMode === "live" ? "Live service" : "Reference view"}
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
              ? "Queue and detail stay visible together so reviewers can compare confidence, policy context, and conversation history."
              : "This view keeps recommendations readable on mobile while showing why the answer can be trusted or why it is still on hold."}
          </p>
        </div>
      </SurfaceCard>

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
              eyebrow={props.surface === "advisor" ? "Case queue" : "Recent guidance"}
              title={props.surface === "advisor" ? "Advisory requests" : "Latest responses"}
              body="Open a case to inspect reviewer status, confidence, and source proof before moving forward."
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
                      <StatusPill tone={advisoryStatusTone(item.status)}>{item.status.replaceAll("_", " ")}</StatusPill>
                      <StatusPill tone={confidenceTone(item.confidence_band)}>
                        {item.confidence_band} confidence
                      </StatusPill>
                    </div>
                    <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <h3>{item.topic}</h3>
                  <p className="muted">{item.question_text}</p>
                  <p className="muted">
                    {item.citations.length} citations · reviewer: {item.reviewer_decision.outcome.replaceAll("_", " ")}
                  </p>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <div className="content-stack">
            <SurfaceCard>
              <SectionHeading
                eyebrow={activeItem.topic}
                title="Guidance summary"
                body={activeItem.question_text}
                actions={
                  <div className="pill-row">
                    <StatusPill tone={advisoryStatusTone(activeItem.status)}>
                      {activeItem.status.replaceAll("_", " ")}
                    </StatusPill>
                    <StatusPill tone={confidenceTone(activeItem.confidence_band)}>
                      {Math.round(activeItem.confidence_score * 100)}% confidence
                    </StatusPill>
                  </div>
                }
              />
              <p>{activeItem.response_text}</p>
              {activeItem.status === "blocked" ? (
                <InsightCallout title="Blocked delivery" body={copy.blockedCopy} tone="accent" />
              ) : null}
              {activeItem.status === "hitl_required" ? (
                <InsightCallout title="Held for human review" body={copy.hitlCopy} tone="brand" />
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={copy.reviewerLabel}
                title={reviewerHeadline(activeItem)}
                body={reviewerBody(activeItem)}
              />
              <ul className="info-list">
                <li>
                  <span>Reason code</span>
                  <strong>{activeItem.reviewer_decision.reason_code}</strong>
                </li>
                <li>
                  <span>Policy threshold</span>
                  <strong>{Math.round(activeItem.reviewer_decision.policy_context.confidence_threshold * 100)}%</strong>
                </li>
                <li>
                  <span>Policy sensitivity</span>
                  <strong>{activeItem.reviewer_decision.policy_context.policy_sensitive ? "Sensitive" : "Routine"}</strong>
                </li>
              </ul>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={copy.citationsLabel}
                title="Source proof"
                body="Field guidance stays attached to the evidence used to form it."
                actions={
                  <button className="button-ghost" onClick={toggleDrawer} type="button">
                    {drawerOpen ? "Hide citations" : "Open citation drawer"}
                  </button>
                }
              />
              <p className="muted">
                {activeItem.citations.length} vetted sources linked · model {activeItem.model_name} {activeItem.model_version}
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
                body="The final response can be checked against the prompts and reviewer events that shaped it."
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
