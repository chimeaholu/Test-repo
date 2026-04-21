"use client";

import type {
  FinanceDecisionInput,
  FinancePartnerRequestInput,
  InsuranceTriggerEvaluationInput,
} from "@agrodomain/contracts";
import React, { useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import {
  queueStatusLabel,
  queueStatusTone,
  responsibilityOwnerCopy,
  toQueueItem,
  toReviewDetail,
  type FinanceConsoleRecord,
  type FinanceQueueStatus,
} from "@/features/finance/model";
import { agroApiClient } from "@/lib/api/mock-client";
import { recordTelemetry } from "@/lib/telemetry/client";

type InsuranceRuntimeSnapshot = {
  evaluation_state: string;
  payout_dedupe_key: string;
  threshold_source_id: string;
  threshold_source_type: string;
  trigger_id: string;
  payout_event_id: string | null;
};

const FILTER_OPTIONS: Array<{ label: string; value: FinanceQueueStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending review", value: "pending_review" },
  { label: "Approved", value: "approved" },
  { label: "Blocked", value: "blocked" },
  { label: "HITL required", value: "hitl_required" },
];

export function FinanceReviewConsole() {
  const { session, traceId } = useAppState();
  const [records, setRecords] = useState<FinanceConsoleRecord[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<FinanceQueueStatus | "all">("all");
  const [auditCountByRequestId, setAuditCountByRequestId] = useState<Record<string, number>>({});
  const [insuranceByRequestId, setInsuranceByRequestId] = useState<Record<string, InsuranceRuntimeSnapshot>>({});
  const [triggerSubmitting, setTriggerSubmitting] = useState(false);

  const [requestForm, setRequestForm] = useState({
    caseReference: "listing/listing-201",
    productType: "invoice_advance",
    requestedAmount: "1500",
    currency: "GHS",
    partnerId: "partner-agri-bank",
    partnerReferenceId: "partner-case-201",
  });

  const [triggerForm, setTriggerForm] = useState({
    triggerId: "trigger-rain-201",
    partnerId: "partner-insurer-1",
    partnerReferenceId: "policy-201",
    climateSignal: "rainfall_mm",
    comparator: "gte",
    thresholdValue: "75",
    thresholdUnit: "mm",
    evaluationWindowHours: "24",
    thresholdSourceId: "threshold-201",
    thresholdSourceType: "policy_table",
    observedValue: "82",
    sourceEventId: "climate-event-201",
    sourceObservationId: "obs-201",
    payoutAmount: "450",
    payoutCurrency: "GHS",
  });

  const queueItems = useMemo(() => {
    const list = records.map((record) => toQueueItem(record));
    if (queueFilter === "all") {
      return list;
    }
    return list.filter((item) => item.status === queueFilter);
  }, [records, queueFilter]);

  const selectedRecord = records.find((item) => item.request.finance_request_id === selectedRequestId) ?? null;
  const selectedDetail = selectedRecord ? toReviewDetail(selectedRecord) : null;
  const selectedInsurance = selectedRequestId ? insuranceByRequestId[selectedRequestId] : null;

  if (!session) {
    return null;
  }
  const activeSession = session;

  async function refreshAuditCount(
    financeRequestId: string,
    requestId: string,
    idempotencyKey: string,
  ): Promise<void> {
    const auditResponse = await agroApiClient.getAuditEvents(requestId, idempotencyKey, traceId);
    setAuditCountByRequestId((current) => ({
      ...current,
      [financeRequestId]: auditResponse.data.items.length,
    }));
  }

  async function submitFinanceRequest(): Promise<void> {
    setRequestError(null);
    setRequestSubmitting(true);
    try {
      const payload: FinancePartnerRequestInput = {
        case_reference: requestForm.caseReference,
        product_type: requestForm.productType as FinancePartnerRequestInput["product_type"],
        requested_amount: Number(requestForm.requestedAmount),
        currency: requestForm.currency,
        partner_id: requestForm.partnerId,
        partner_reference_id: requestForm.partnerReferenceId || null,
        actor_role: activeSession.actor.role,
        responsibility_boundary: {
          owner: "partner",
          internal_can_prepare: true,
          internal_can_block: true,
          internal_can_approve: false,
          partner_decision_required: true,
        },
        policy_context: {
          policy_id: "finance.partner.v1",
          policy_version: "2026-04",
          matched_rule: "finance.partner.invoice_advance",
          requires_hitl: true,
        },
        transcript_entries: [],
      };
      const response = await agroApiClient.submitFinancePartnerRequest(
        payload,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      const nextRecord: FinanceConsoleRecord = {
        request: response.data.finance_request,
        decisions: [],
      };
      setRecords((current) => [nextRecord, ...current]);
      setSelectedRequestId(response.data.finance_request.finance_request_id);
      await refreshAuditCount(
        response.data.finance_request.finance_request_id,
        response.data.request_id,
        response.data.idempotency_key,
      );
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to submit finance request.");
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function recordDecision(outcome: "approved" | "blocked" | "hitl_required"): Promise<void> {
    if (!selectedDetail) {
      return;
    }
    setDecisionError(null);
    setDecisionSubmitting(true);
    try {
      const payload: FinanceDecisionInput = {
        finance_request_id: selectedDetail.finance_request_id,
        decision_source: "partner",
        outcome,
        actor_role: activeSession.actor.role,
        reason_code: outcome === "approved" ? "evidence_sufficient" : "policy_hitl_required",
        note:
          outcome === "approved"
            ? "Partner approval recorded through HITL console."
            : "Partner requires additional manual review before approval.",
        partner_reference_id: selectedDetail.partner_reference_id,
        transcript_link: `audit://finance/${selectedDetail.finance_request_id}/${outcome}`,
      };
      const response = await agroApiClient.recordFinancePartnerDecision(
        payload,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      setRecords((current) =>
        current.map((item) =>
          item.request.finance_request_id === response.data.finance_request.finance_request_id
            ? {
                request: response.data.finance_request,
                decisions: [...item.decisions, response.data.finance_decision],
              }
            : item,
        ),
      );
      await refreshAuditCount(
        response.data.finance_request.finance_request_id,
        response.data.request_id,
        response.data.idempotency_key,
      );
      recordTelemetry({
        event: "finance_decision_action_recorded",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          outcome,
          finance_request_id: selectedDetail.finance_request_id,
        },
      });
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : "Unable to record finance decision.");
    } finally {
      setDecisionSubmitting(false);
    }
  }

  async function evaluateTrigger(): Promise<void> {
    if (!selectedDetail) {
      return;
    }
    setDecisionError(null);
    setTriggerSubmitting(true);
    try {
      const payload: InsuranceTriggerEvaluationInput = {
        trigger_id: triggerForm.triggerId,
        partner_id: triggerForm.partnerId,
        partner_reference_id: triggerForm.partnerReferenceId || null,
        actor_role: activeSession.actor.role,
        product_code: "rainfall-cover",
        climate_signal: triggerForm.climateSignal as InsuranceTriggerEvaluationInput["climate_signal"],
        comparator: triggerForm.comparator as InsuranceTriggerEvaluationInput["comparator"],
        threshold_value: Number(triggerForm.thresholdValue),
        threshold_unit: triggerForm.thresholdUnit,
        evaluation_window_hours: Number(triggerForm.evaluationWindowHours),
        threshold_source_id: triggerForm.thresholdSourceId,
        threshold_source_type: triggerForm.thresholdSourceType,
        threshold_source_reference: { policy_ref: triggerForm.partnerReferenceId || "policy-default" },
        observed_value: Number(triggerForm.observedValue),
        source_event_id: triggerForm.sourceEventId,
        source_observation_id: triggerForm.sourceObservationId || null,
        observed_at: new Date().toISOString(),
        payout_amount: Number(triggerForm.payoutAmount),
        payout_currency: triggerForm.payoutCurrency,
        policy_context: {
          policy_id: "insurance.parametric.v1",
          policy_version: "2026-04",
          matched_rule: "insurance.rainfall.gte",
          requires_hitl: false,
        },
      };
      const response = await agroApiClient.evaluateInsuranceTrigger(
        payload,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      setInsuranceByRequestId((current) => ({
        ...current,
        [selectedDetail.finance_request_id]: {
          trigger_id: String(response.data.insurance_trigger.trigger_id ?? triggerForm.triggerId),
          evaluation_state: response.data.insurance_evaluation.evaluation_state,
          payout_dedupe_key: response.data.insurance_evaluation.payout_dedupe_key,
          threshold_source_id: String(response.data.insurance_trigger.threshold_source_id ?? triggerForm.thresholdSourceId),
          threshold_source_type: String(
            response.data.insurance_trigger.threshold_source_type ?? triggerForm.thresholdSourceType,
          ),
          payout_event_id: response.data.insurance_payout_event?.payout_event_id ?? null,
        },
      }));
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : "Unable to evaluate insurance trigger.");
    } finally {
      setTriggerSubmitting(false);
    }
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Finance and insurance review"
          title="Review partner-owned decisions without hidden approval paths"
          body="Queue status, responsibility boundaries, partner state, and actor-attributed actions stay visible in one workspace."
          actions={
            <div className="pill-row">
              <StatusPill tone="neutral">{queueItems.length} queue item(s)</StatusPill>
              <StatusPill tone="degraded">Partner approval required</StatusPill>
            </div>
          }
        />
        <p className="muted">This console records partner decisions only. Internal approval shortcuts remain blocked by policy.</p>
        <div className="hero-kpi-grid" aria-label="Finance posture">
          <article className="hero-kpi">
            <span className="metric-label">Queue items</span>
            <strong>{queueItems.length}</strong>
            <p className="muted">Visible records after the current filter is applied.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Selected review</span>
            <strong>{selectedDetail ? queueStatusLabel(selectedDetail.status) : "None selected"}</strong>
            <p className="muted">Decision controls stay contextual to the current case.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Audit proof</span>
            <strong>{selectedRequestId && auditCountByRequestId[selectedRequestId] ? "Captured" : "Pending"}</strong>
            <p className="muted">Audit events are surfaced after partner-facing actions complete.</p>
          </article>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          eyebrow="New review case"
          title="Submit a partner request"
          body="Requests are sent into the protected workflow and appear in the review queue once accepted."
        />
        <div className="journey-grid compact-grid" aria-label="Finance request rules">
          <article className="journey-card subtle">
            <h3>Partner owns approval</h3>
            <p className="muted">Internal operators can prepare and block, but cannot silently self-approve.</p>
          </article>
          <article className="journey-card subtle">
            <h3>Case context remains attached</h3>
            <p className="muted">Case reference, partner reference, and product type stay visible throughout review.</p>
          </article>
        </div>
        <div className="form-grid two-column">
          <label>
            Case reference
            <input
              value={requestForm.caseReference}
              onChange={(event) => setRequestForm((current) => ({ ...current, caseReference: event.target.value }))}
            />
          </label>
          <label>
            Product type
            <select
              value={requestForm.productType}
              onChange={(event) => setRequestForm((current) => ({ ...current, productType: event.target.value }))}
            >
              <option value="invoice_advance">Invoice advance</option>
              <option value="working_capital">Working capital</option>
              <option value="input_credit">Input credit</option>
            </select>
          </label>
          <label>
            Requested amount
            <input
              value={requestForm.requestedAmount}
              onChange={(event) => setRequestForm((current) => ({ ...current, requestedAmount: event.target.value }))}
            />
          </label>
          <label>
            Currency
            <input value={requestForm.currency} onChange={(event) => setRequestForm((current) => ({ ...current, currency: event.target.value }))} />
          </label>
          <label>
            Partner id
            <input value={requestForm.partnerId} onChange={(event) => setRequestForm((current) => ({ ...current, partnerId: event.target.value }))} />
          </label>
          <label>
            Partner reference
            <input
              value={requestForm.partnerReferenceId}
              onChange={(event) => setRequestForm((current) => ({ ...current, partnerReferenceId: event.target.value }))}
            />
          </label>
        </div>
        <div className="actions-row">
          <button className="button-primary" onClick={() => void submitFinanceRequest()} disabled={requestSubmitting} type="button">
            {requestSubmitting ? "Submitting..." : "Submit finance request"}
          </button>
          <p className="muted detail-note">Submission creates a protected case record. It does not imply approval.</p>
        </div>
        {requestError ? (
          <p className="field-error" role="alert">
            {requestError}
          </p>
        ) : null}
      </SurfaceCard>

      <div className="climate-layout">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Queue"
            title="Finance and insurance review queue"
            body="Filter the queue by pending review, approved, blocked, or manual review required."
            actions={
              <label className="inline-field">
                Filter
                <select
                  value={queueFilter}
                  onChange={(event) => {
                    const value = event.target.value as FinanceQueueStatus | "all";
                    setQueueFilter(value);
                    recordTelemetry({
                      event: "finance_queue_filter_changed",
                      trace_id: traceId,
                      timestamp: new Date().toISOString(),
                      detail: {
                        queue_filter: value,
                        queue_size: queueItems.length,
                      },
                    });
                  }}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <p className="muted detail-note">The queue keeps ownership and status visible so reviewers can explain what is blocked, awaiting partner action, or fully resolved.</p>
          {queueItems.length === 0 ? (
            <InsightCallout
              title="No queue items yet"
              body="Submit a partner request to populate the review queue with live records."
              tone="neutral"
            />
          ) : (
            <div className="advisory-thread-list" role="list" aria-label="Finance review queue">
              {queueItems.map((item) => (
                <button
                  key={item.finance_request_id}
                  className={`thread-list-item advisory-list-item${item.finance_request_id === selectedRequestId ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedRequestId(item.finance_request_id)}
                >
                  <div className="queue-head">
                    <div className="pill-row">
                      <StatusPill tone={queueStatusTone(item.status)}>{queueStatusLabel(item.status)}</StatusPill>
                      <StatusPill tone="neutral">{responsibilityOwnerCopy(item.responsibility_boundary.owner)}</StatusPill>
                    </div>
                    <span className="muted">{new Date(item.updated_at).toLocaleString()}</span>
                  </div>
                  <h3>{item.summary}</h3>
                  <p className="muted">Partner: {item.partner_id}</p>
                </button>
              ))}
            </div>
          )}
        </SurfaceCard>

        <div className="content-stack">
          {selectedDetail ? (
            <SurfaceCard>
              <SectionHeading
                eyebrow={selectedDetail.finance_request_id}
                title="Decision detail"
                body="Every decision remains actor-attributed and sourced from explicit partner action."
                actions={
                  <div className="pill-row">
                    <StatusPill tone={queueStatusTone(selectedDetail.status)}>{queueStatusLabel(selectedDetail.status)}</StatusPill>
                    <StatusPill tone={selectedDetail.responsibility_boundary.partner_decision_required ? "degraded" : "neutral"}>
                      {selectedDetail.responsibility_boundary.partner_decision_required ? "Partner decision required" : "Shared decision"}
                    </StatusPill>
                  </div>
                }
              />
              <InfoList
                items={[
                  { label: "Case reference", value: selectedDetail.request.case_reference },
                  { label: "Requested amount", value: `${selectedDetail.request.requested_amount} ${selectedDetail.request.currency}` },
                  { label: "Partner reference", value: selectedDetail.partner_reference_id ?? "Not provided" },
                  { label: "Policy", value: selectedDetail.policy_context.policy_id },
                  { label: "Actor history count", value: String(selectedDetail.decisions.length) },
                  { label: "Audit events returned", value: String(auditCountByRequestId[selectedDetail.finance_request_id] ?? 0) },
                ]}
              />
              <div className="actions-row">
                <button className="button-primary" type="button" disabled={decisionSubmitting} onClick={() => void recordDecision("approved")}>
                  Record partner approved
                </button>
                <button className="button-secondary" type="button" disabled={decisionSubmitting} onClick={() => void recordDecision("blocked")}>
                  Record blocked
                </button>
                <button className="button-ghost" type="button" disabled={decisionSubmitting} onClick={() => void recordDecision("hitl_required")}>
                  Require manual review
                </button>
              </div>
              {selectedDetail.decisions.length > 0 ? (
                <div className="stack-md">
                  {selectedDetail.decisions.map((decision) => (
                    <article className="queue-item" key={decision.decision_id}>
                      <div className="queue-head">
                        <strong>{decision.outcome}</strong>
                        <StatusPill tone="neutral">{decision.decision_source}</StatusPill>
                      </div>
                      <p className="muted">
                        {decision.reason_code} • {decision.actor_id} • {new Date(decision.decided_at).toLocaleString()}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
              {decisionError ? (
                <p className="field-error" role="alert">
                  {decisionError}
                </p>
              ) : null}
            </SurfaceCard>
          ) : (
            <SurfaceCard>
              <p className="muted">Select a queue item to inspect responsibility boundaries, partner status, and decision history.</p>
            </SurfaceCard>
          )}

          {selectedDetail ? (
            <SurfaceCard>
              <SectionHeading
                eyebrow="Insurance trigger"
                title="Parametric trigger and payout provenance"
                body="Trigger source references and payout dedupe markers are shown directly from the evaluation result."
              />
              <div className="form-grid two-column">
                <label>
                  Trigger id
                  <input value={triggerForm.triggerId} onChange={(event) => setTriggerForm((current) => ({ ...current, triggerId: event.target.value }))} />
                </label>
                <label>
                  Partner id
                  <input value={triggerForm.partnerId} onChange={(event) => setTriggerForm((current) => ({ ...current, partnerId: event.target.value }))} />
                </label>
                <label>
                  Threshold value
                  <input
                    value={triggerForm.thresholdValue}
                    onChange={(event) => setTriggerForm((current) => ({ ...current, thresholdValue: event.target.value }))}
                  />
                </label>
                <label>
                  Observed value
                  <input
                    value={triggerForm.observedValue}
                    onChange={(event) => setTriggerForm((current) => ({ ...current, observedValue: event.target.value }))}
                  />
                </label>
                <label>
                  Threshold source id
                  <input
                    value={triggerForm.thresholdSourceId}
                    onChange={(event) => setTriggerForm((current) => ({ ...current, thresholdSourceId: event.target.value }))}
                  />
                </label>
                <label>
                  Source event id
                  <input
                    value={triggerForm.sourceEventId}
                    onChange={(event) => setTriggerForm((current) => ({ ...current, sourceEventId: event.target.value }))}
                  />
                </label>
              </div>
              <div className="actions-row">
                <button className="button-secondary" type="button" disabled={triggerSubmitting} onClick={() => void evaluateTrigger()}>
                  {triggerSubmitting ? "Evaluating..." : "Evaluate trigger"}
                </button>
              </div>
              {selectedInsurance ? (
                <InfoList
                  items={[
                    { label: "Trigger id", value: selectedInsurance.trigger_id },
                    { label: "Evaluation state", value: selectedInsurance.evaluation_state },
                    { label: "Payout dedupe key", value: selectedInsurance.payout_dedupe_key },
                    { label: "Threshold source", value: `${selectedInsurance.threshold_source_type}:${selectedInsurance.threshold_source_id}` },
                    { label: "Payout event id", value: selectedInsurance.payout_event_id ?? "No payout emitted" },
                  ]}
                />
              ) : null}
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
