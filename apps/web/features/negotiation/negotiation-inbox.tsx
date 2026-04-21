"use client";

import type {
  NegotiationConfirmationApproveInput,
  NegotiationConfirmationRejectInput,
  NegotiationConfirmationRequestInput,
  NegotiationCounterInput,
  NegotiationCreateInput,
  NegotiationMessage,
  NegotiationThreadRead,
} from "@agrodomain/contracts";
import React, { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, ErrorState, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { agroApiClient } from "@/lib/api/mock-client";
import { recordTelemetry } from "@/lib/telemetry/client";
import { deriveNegotiationThreadUiState } from "@/features/negotiation/thread-state";

type NegotiationInboxClientProps = {
  initialListingId?: string;
  initialThreadId?: string;
};

type MutationEvidence = {
  actionLabel: string;
  auditEventCount: number;
  idempotencyKey: string;
  replayed: boolean;
  requestId: string;
  threadId: string;
} | null;

type CreateOfferFormState = {
  listingId: string;
  note: string;
  offerAmount: string;
  offerCurrency: string;
};

type CounterOfferFormState = {
  note: string;
  offerAmount: string;
  offerCurrency: string;
};

const initialCreateOfferState: CreateOfferFormState = {
  listingId: "",
  note: "",
  offerAmount: "500",
  offerCurrency: "GHS",
};

const initialCounterOfferState: CounterOfferFormState = {
  note: "",
  offerAmount: "510",
  offerCurrency: "GHS",
};

function optionalNote(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function validateMoneyInput(amount: string, currency: string): string | null {
  if (!amount.trim()) {
    return "Offer amount is required.";
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Offer amount must be greater than zero.";
  }
  if (!/^[A-Z]{3}$/u.test(currency.trim().toUpperCase())) {
    return "Currency must be a three-letter ISO code.";
  }
  return null;
}

function threadTitle(thread: NegotiationThreadRead, actorId: string): string {
  const counterpart = thread.seller_actor_id === actorId ? thread.buyer_actor_id : thread.seller_actor_id;
  return `${thread.listing_id} with ${counterpart}`;
}

function messageLabel(action: NegotiationMessage["action"]): string {
  switch (action) {
    case "offer_created":
      return "Offer created";
    case "offer_countered":
      return "Seller countered";
    case "confirmation_requested":
      return "Confirmation requested";
    case "confirmation_approved":
      return "Confirmation approved";
    case "confirmation_rejected":
      return "Confirmation rejected";
    default:
      return action;
  }
}

function mutationErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "thread_closed":
      return "This thread is locked in a terminal state. Further counters are blocked server-side.";
    case "confirmation_checkpoint_missing":
      return "This action requires a pending confirmation checkpoint. Refresh the thread before trying again.";
    case "policy_denied":
      return "The server rejected that action for your actor scope.";
    case "thread_not_found":
      return "The selected thread is unavailable in your actor scope or no longer exists.";
    case "listing_not_found":
      return "The listing is not published in your current buyer scope.";
    default:
      return errorCode;
  }
}

async function loadAuditEvidence(requestId: string, idempotencyKey: string, traceId: string): Promise<number> {
  const audit = await agroApiClient.getAuditEvents(requestId, idempotencyKey, traceId);
  return audit.data.items.length;
}

const negotiationPageCopy = {
  title: "Track every live negotiation in one place",
  body: "Open the right thread, review the latest offer, and confirm each decision with visible proof before you respond.",
};

export function NegotiationInboxClient(props: NegotiationInboxClientProps) {
  const { session, traceId } = useAppState();
  const [threads, setThreads] = useState<NegotiationThreadRead[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState(props.initialThreadId ?? "");
  const [selectedThread, setSelectedThread] = useState<NegotiationThreadRead | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [evidence, setEvidence] = useState<MutationEvidence>(null);
  const [createOffer, setCreateOffer] = useState<CreateOfferFormState>({
    ...initialCreateOfferState,
    listingId: props.initialListingId ?? "",
  });
  const [counterOffer, setCounterOffer] = useState<CounterOfferFormState>(initialCounterOfferState);
  const [confirmationRequestNote, setConfirmationRequestNote] = useState("Need final buyer confirmation");
  const [confirmationDecisionNote, setConfirmationDecisionNote] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshInbox(props.initialThreadId ?? "");
  }, [props.initialThreadId, session, traceId]);

  useEffect(() => {
    if (!session) {
      return;
    }
    recordTelemetry({
      event: "negotiation_inbox_view",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        actor_role: session.actor.role,
        selected_thread_id: selectedThreadId || "none",
        thread_count: threads.length,
      },
    });
  }, [selectedThreadId, session, threads.length, traceId]);

  if (!session) {
    return null;
  }

  const activeSession = session;

  async function refreshInbox(preferredThreadId = selectedThreadId): Promise<void> {
    setIsLoadingInbox(true);
    try {
      const response = await agroApiClient.listNegotiations(traceId);
      const items = response.data.items;
      setThreads(items);
      setMutationError(null);

      const nextThreadId = preferredThreadId || items[0]?.thread_id || "";
      setSelectedThreadId(nextThreadId);

      if (nextThreadId) {
        await loadThread(nextThreadId);
      } else {
        setSelectedThread(null);
        setThreadError(null);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "Unable to load negotiation inbox.";
      setThreadError(code);
      setSelectedThread(null);
    } finally {
      setIsLoadingInbox(false);
    }
  }

  async function loadThread(threadId: string): Promise<void> {
    setIsLoadingThread(true);
    try {
      const response = await agroApiClient.getNegotiationThread(threadId, traceId);
      setSelectedThread(response.data);
      setThreadError(null);
      setCounterOffer((current) => ({
        ...current,
        offerAmount: response.data.current_offer_amount.toString(),
        offerCurrency: response.data.current_offer_currency,
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "Unable to load negotiation thread.";
      setSelectedThread(null);
      setThreadError(code);
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function runMutation(
    actionLabel: string,
    run: () => Promise<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>,
  ): Promise<void> {
    setIsMutating(true);
    setMutationError(null);
    const startedAt = performance.now();

    try {
      const response = await run();
      const auditEventCount = await loadAuditEvidence(response.request_id, response.idempotency_key, traceId);
      setEvidence({
        actionLabel,
        auditEventCount,
        idempotencyKey: response.idempotency_key,
        replayed: response.replayed,
        requestId: response.request_id,
        threadId: response.thread.thread_id,
      });
      setSelectedThreadId(response.thread.thread_id);
      setSelectedThread(response.thread);
      await refreshInbox(response.thread.thread_id);

      recordTelemetry({
        event: "negotiation_submit_latency",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action: actionLabel,
          duration_ms: Math.round(performance.now() - startedAt),
          replayed: response.replayed,
          thread_id: response.thread.thread_id,
        },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "negotiation_request_failed";
      setMutationError(mutationErrorMessage(code));
      recordTelemetry({
        event: "negotiation_submit_failure",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action: actionLabel,
          error_code: code,
          selected_thread_id: selectedThreadId || "none",
        },
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function submitCreateOffer(): Promise<void> {
    if (activeSession.actor.role !== "buyer") {
      setMutationError("Only buyer actors can open a new offer thread from the inbox.");
      return;
    }
    const validationError = validateMoneyInput(createOffer.offerAmount, createOffer.offerCurrency);
    if (validationError) {
      setMutationError(validationError);
      return;
    }
    if (!createOffer.listingId.trim()) {
      setMutationError("Listing ID is required to open a negotiation thread.");
      return;
    }

    const input: NegotiationCreateInput = {
      listing_id: createOffer.listingId.trim(),
      offer_amount: Number(createOffer.offerAmount),
      offer_currency: createOffer.offerCurrency.trim().toUpperCase(),
      note: optionalNote(createOffer.note),
    };

    await runMutation("Offer created", async () => {
      const response = await agroApiClient.createNegotiation(
        input,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      return response.data;
    });
  }

  async function submitCounterOffer(): Promise<void> {
    if (!selectedThread) {
      return;
    }
    const validationError = validateMoneyInput(counterOffer.offerAmount, counterOffer.offerCurrency);
    if (validationError) {
      setMutationError(validationError);
      return;
    }

    const input: NegotiationCounterInput = {
      thread_id: selectedThread.thread_id,
      offer_amount: Number(counterOffer.offerAmount),
      offer_currency: counterOffer.offerCurrency.trim().toUpperCase(),
      note: optionalNote(counterOffer.note),
    };

    await runMutation("Counter committed", async () => {
      const response = await agroApiClient.counterNegotiation(
        input,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      return response.data;
    });
  }

  async function submitConfirmationRequest(requiredConfirmerActorId: string): Promise<void> {
    if (!selectedThread) {
      return;
    }

    const input: NegotiationConfirmationRequestInput = {
      thread_id: selectedThread.thread_id,
      required_confirmer_actor_id: requiredConfirmerActorId,
      note: optionalNote(confirmationRequestNote),
    };

    await runMutation("Confirmation requested", async () => {
      const response = await agroApiClient.requestNegotiationConfirmation(
        input,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      return response.data;
    });
  }

  async function submitConfirmationDecision(decision: "approve" | "reject"): Promise<void> {
    if (!selectedThread) {
      return;
    }

    const baseInput = {
      thread_id: selectedThread.thread_id,
      note: optionalNote(confirmationDecisionNote),
    };

    await runMutation(decision === "approve" ? "Confirmation approved" : "Confirmation rejected", async () => {
      const response =
        decision === "approve"
          ? await agroApiClient.approveNegotiationConfirmation(
              baseInput as NegotiationConfirmationApproveInput,
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            )
          : await agroApiClient.rejectNegotiationConfirmation(
              baseInput as NegotiationConfirmationRejectInput,
              traceId,
              activeSession.actor.actor_id,
              activeSession.actor.country_code,
            );
      return response.data;
    });
  }

  const threadUiState = selectedThread
    ? deriveNegotiationThreadUiState(selectedThread, activeSession.actor.actor_id)
    : null;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Offers and negotiations"
          title={negotiationPageCopy.title}
          body={negotiationPageCopy.body}
        />
        <div className="pill-row">
          <StatusPill tone="neutral">{activeSession.actor.role}</StatusPill>
          <StatusPill tone={selectedThread ? (threadUiState?.statusTone ?? "neutral") : "neutral"}>
            {selectedThread ? threadUiState?.statusLabel : "Inbox ready"}
          </StatusPill>
        </div>
        <div className="hero-kpi-grid" aria-label="Negotiation workspace posture">
          <article className="hero-kpi">
            <span className="metric-label">Visible threads</span>
            <strong>{threads.length}</strong>
            <p className="muted">Only participant threads surface in this inbox.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Selected state</span>
            <strong>{selectedThread ? threadUiState?.statusLabel : "Choose a thread"}</strong>
            <p className="muted">Controls change as confirmation and terminal states evolve.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Evidence capture</span>
            <strong>{evidence ? "Live" : "Pending action"}</strong>
            <p className="muted">Request metadata appears after each regulated mutation.</p>
          </article>
        </div>
      </SurfaceCard>

      {mutationError ? <ErrorState title="The action could not be completed" body={mutationError} /> : null}

      {threadError ? (
        <ErrorState
          title={threadError === "thread_not_found" ? "Thread not available in your actor scope" : "The thread could not be loaded"}
          body={mutationErrorMessage(threadError)}
        />
      ) : null}

      <div className="negotiation-layout">
        <article className="queue-card">
          <SectionHeading
            eyebrow="Inbox"
            title="Visible negotiations"
            body="Only participant threads appear here. If you are not part of the negotiation, you do not see the thread or its confirmation controls."
          />
          <div className="journey-grid compact-grid" aria-label="Inbox rules">
            <article className="journey-card subtle">
              <h3>Scope is enforced</h3>
              <p className="muted">Threads outside your actor scope fail closed and stay out of the list.</p>
            </article>
            <article className="journey-card subtle">
              <h3>Status drives controls</h3>
              <p className="muted">Open, pending confirmation, accepted, and rejected threads do not share the same actions.</p>
            </article>
          </div>

          {isLoadingInbox ? <p className="muted" role="status">Loading negotiations...</p> : null}
          {!isLoadingInbox && threads.length === 0 ? (
            <InsightCallout
              title="No visible threads yet"
              body="Create an offer from a published lot or wait for the counterparty to start the thread."
              tone="neutral"
            />
          ) : null}

          <div className="queue-list" role="list" aria-label="Negotiation threads">
            {threads.map((thread) => {
              const state = deriveNegotiationThreadUiState(thread, activeSession.actor.actor_id);
              return (
                <button
                  className={`thread-list-item ${thread.thread_id === selectedThreadId ? "is-active" : ""}`}
                  key={thread.thread_id}
                  onClick={() => {
                    setSelectedThreadId(thread.thread_id);
                    void loadThread(thread.thread_id);
                  }}
                  type="button"
                >
                  <div className="queue-head">
                    <strong>{threadTitle(thread, activeSession.actor.actor_id)}</strong>
                    <StatusPill tone={state.statusTone}>{state.statusLabel}</StatusPill>
                  </div>
                  <p className="muted">
                    Offer {thread.current_offer_amount} {thread.current_offer_currency}
                  </p>
                  <p className="muted">Updated {new Date(thread.updated_at).toLocaleString()}</p>
                  {thread.confirmation_checkpoint ? (
                    <p className="muted">Awaiting {thread.confirmation_checkpoint.required_confirmer_actor_id}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </article>

        <div className="content-stack">
          {activeSession.actor.role === "buyer" ? (
            <article className="queue-card">
              <SectionHeading
                eyebrow="Open offer"
                title="Buyer offer composer"
                body="Start with a published lot, submit your offer, and keep the result visible if the request is replayed or retried."
              />
              <p className="muted detail-note">This composer is buyer-only and assumes the lot has already passed the buyer-safe visibility boundary.</p>
              <form
                className="form-stack"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await submitCreateOffer();
                }}
              >
                <div className="field">
                  <label htmlFor="listing-id">Listing ID</label>
                  <input
                    id="listing-id"
                    onChange={(event) =>
                      setCreateOffer((current) => ({ ...current, listingId: event.target.value }))
                    }
                    value={createOffer.listingId}
                  />
                  <p className="field-help">Use a published listing id. Owner and unpublished listings fail closed.</p>
                </div>
                <div className="grid-two">
                  <div className="field">
                    <label htmlFor="offer-amount">Offer amount</label>
                    <input
                      id="offer-amount"
                      onChange={(event) =>
                        setCreateOffer((current) => ({ ...current, offerAmount: event.target.value }))
                      }
                      step="0.01"
                      type="number"
                      value={createOffer.offerAmount}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="offer-currency">Currency</label>
                    <input
                      id="offer-currency"
                      onChange={(event) =>
                        setCreateOffer((current) => ({ ...current, offerCurrency: event.target.value.toUpperCase() }))
                      }
                      value={createOffer.offerCurrency}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="offer-note">Buyer note</label>
                  <textarea
                    id="offer-note"
                    onChange={(event) => setCreateOffer((current) => ({ ...current, note: event.target.value }))}
                    rows={3}
                    value={createOffer.note}
                  />
                </div>
                <button className="button-primary" disabled={isMutating} type="submit">
                  {isMutating ? "Submitting offer..." : "Create offer thread"}
                </button>
              </form>
            </article>
          ) : null}

          <article className="queue-card">
              <SectionHeading
                eyebrow="Thread"
                title={selectedThread ? threadTitle(selectedThread, activeSession.actor.actor_id) : "Choose a negotiation"}
                body="Message history, confirmation checkpoints, and closed-state protections stay visible so both sides understand what happens next."
              />

            {isLoadingThread ? <p className="muted" role="status">Loading selected negotiation...</p> : null}
            {!selectedThread && !isLoadingThread ? (
              <EmptyState
                title="No negotiation selected"
                body="Choose a thread from the inbox, or create a new buyer offer to populate this panel."
              />
            ) : null}

            {selectedThread && threadUiState ? (
              <div className="content-stack">
                <div className="pill-row">
                  <StatusPill tone={threadUiState.statusTone}>{threadUiState.statusLabel}</StatusPill>
                  <StatusPill tone="neutral">{selectedThread.current_offer_amount} {selectedThread.current_offer_currency}</StatusPill>
                  <StatusPill tone="neutral">{selectedThread.thread_id}</StatusPill>
                </div>
                <div className="hero-kpi-grid" aria-label="Selected thread summary">
                  <article className="hero-kpi">
                    <span className="metric-label">Current offer</span>
                    <strong>
                      {selectedThread.current_offer_amount} {selectedThread.current_offer_currency}
                    </strong>
                    <p className="muted">Latest commercial position for this thread.</p>
                  </article>
                  <article className="hero-kpi">
                    <span className="metric-label">Participants</span>
                    <strong>Buyer and seller only</strong>
                    <p className="muted">Confirmation controls are restricted to the named participant when a checkpoint exists.</p>
                  </article>
                </div>

                {selectedThread.status === "pending_confirmation" && selectedThread.confirmation_checkpoint ? (
                  <InsightCallout
                    title="Waiting for confirmation"
                    body={`Requested by ${selectedThread.confirmation_checkpoint.requested_by_actor_id}. Authorized confirmer: ${selectedThread.confirmation_checkpoint.required_confirmer_actor_id}.`}
                    tone="accent"
                  />
                ) : null}

                {threadUiState.isTerminal ? (
                  <InsightCallout
                    title="Terminal-state lock is active"
                    body={`Thread status is ${selectedThread.status}. Counter and confirmation-request controls are intentionally disabled because the thread is already closed.`}
                    tone={selectedThread.status === "accepted" ? "brand" : "accent"}
                  />
                ) : null}

                <div className="negotiation-thread-grid">
                  <div className="content-stack">
                    <SurfaceCard className="thread-panel">
                      <SectionHeading
                        eyebrow="Conversation"
                        title="Message history"
                        body="Each offer, counter, and confirmation step is added to the timeline so the commercial record is easy to follow."
                      />
                      <ol className="timeline">
                        {selectedThread.messages.map((message, index) => (
                          <li key={`${message.created_at}-${index}`}>
                            <span
                              className={`timeline-marker ${
                                message.action === "confirmation_approved"
                                  ? "done"
                                  : message.action === "confirmation_requested"
                                    ? "current"
                                    : ""
                              }`}
                            />
                            <div className="stack-sm">
                              <strong>{messageLabel(message.action)}</strong>
                              <p className="muted">
                                {message.actor_id}
                                {message.amount ? ` • ${message.amount} ${message.currency}` : ""}
                              </p>
                              {message.note ? <p>{message.note}</p> : null}
                              <p className="muted">{new Date(message.created_at).toLocaleString()}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </SurfaceCard>
                  </div>

                  <div className="content-stack">
                    {threadUiState.canCounter ? (
                      <article className="surface-card">
                        <SectionHeading
                          eyebrow="Seller action"
                          title="Counter offer"
                          body="Seller-only while the thread is open. This control disappears once the thread leaves open."
                        />
                        <form
                          className="form-stack"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await submitCounterOffer();
                          }}
                        >
                          <div className="grid-two">
                            <div className="field">
                              <label htmlFor="counter-amount">Counter amount</label>
                              <input
                                id="counter-amount"
                                onChange={(event) =>
                                  setCounterOffer((current) => ({ ...current, offerAmount: event.target.value }))
                                }
                                step="0.01"
                                type="number"
                                value={counterOffer.offerAmount}
                              />
                            </div>
                            <div className="field">
                              <label htmlFor="counter-currency">Currency</label>
                              <input
                                id="counter-currency"
                                onChange={(event) =>
                                  setCounterOffer((current) => ({
                                    ...current,
                                    offerCurrency: event.target.value.toUpperCase(),
                                  }))
                                }
                                value={counterOffer.offerCurrency}
                              />
                            </div>
                          </div>
                          <div className="field">
                            <label htmlFor="counter-note">Counter note</label>
                            <textarea
                              id="counter-note"
                              onChange={(event) =>
                                setCounterOffer((current) => ({ ...current, note: event.target.value }))
                              }
                              rows={3}
                              value={counterOffer.note}
                            />
                          </div>
                          <button className="button-secondary" disabled={isMutating} type="submit">
                            {isMutating ? "Submitting counter..." : "Submit counter"}
                          </button>
                        </form>
                      </article>
                    ) : null}

                    {threadUiState.canRequestConfirmation ? (
                      <article className="surface-card">
                        <SectionHeading
                          eyebrow="Checkpoint"
                          title="Request confirmation"
                          body="Participants can move an open thread into pending confirmation, but the confirmer must be the other participant."
                        />
                        <form
                          className="form-stack"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            await submitConfirmationRequest(threadUiState.otherParticipantActorId);
                          }}
                        >
                          <div className="field">
                            <label htmlFor="required-confirmer">Required confirmer</label>
                            <input
                              disabled
                              id="required-confirmer"
                              value={threadUiState.otherParticipantActorId}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="confirmation-request-note">Checkpoint note</label>
                            <textarea
                              id="confirmation-request-note"
                              onChange={(event) => setConfirmationRequestNote(event.target.value)}
                              rows={3}
                              value={confirmationRequestNote}
                            />
                          </div>
                          <button className="button-ghost" disabled={isMutating} type="submit">
                            {isMutating ? "Requesting checkpoint..." : "Move to pending confirmation"}
                          </button>
                        </form>
                      </article>
                    ) : null}

                    {selectedThread.status === "pending_confirmation" && !threadUiState.isAuthorizedConfirmer ? (
                      <article className="surface-card">
                        <InsightCallout
                          title="Waiting for authorized confirmer"
                          body={`Only ${threadUiState.pendingConfirmerActorId ?? "the required participant"} can approve or reject this checkpoint.`}
                          tone="neutral"
                        />
                      </article>
                    ) : null}

                    {threadUiState.canApprove || threadUiState.canReject ? (
                      <article className="surface-card">
                        <SectionHeading
                          eyebrow="Authorized confirmer"
                          title="Approve or reject"
                          body="These terminal controls render only for the actor named in the checkpoint. Approval and rejection both clear the checkpoint server-side."
                        />
                        <form
                          className="form-stack"
                          onSubmit={(event) => {
                            event.preventDefault();
                          }}
                        >
                          <div className="field">
                            <label htmlFor="decision-note">Decision note</label>
                            <textarea
                              id="decision-note"
                              onChange={(event) => setConfirmationDecisionNote(event.target.value)}
                              rows={3}
                              value={confirmationDecisionNote}
                            />
                          </div>
                          <div className="actions-row">
                            <button
                              className="button-primary"
                              disabled={isMutating}
                              onClick={() => void submitConfirmationDecision("approve")}
                              type="button"
                            >
                              {isMutating ? "Approving..." : "Approve thread"}
                            </button>
                            <button
                              className="button-secondary"
                              disabled={isMutating}
                              onClick={() => void submitConfirmationDecision("reject")}
                              type="button"
                            >
                              {isMutating ? "Rejecting..." : "Reject thread"}
                            </button>
                          </div>
                        </form>
                      </article>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </article>

          <article className="queue-card">
            <SectionHeading
              eyebrow="Evidence"
              title="Audit and idempotency cues"
              body="Every regulated mutation returns request identifiers you can replay into the audit route. Repeated submits stay single-effect and clearly marked."
            />
            <p className="muted detail-note">Use this panel to explain whether the last change succeeded once, replayed safely, or still needs another attempt.</p>
            {evidence ? (
              <div className="detail-stack">
                <div className="pill-row">
                  <StatusPill tone="online">{evidence.actionLabel}</StatusPill>
                  <StatusPill tone={evidence.replayed ? "degraded" : "neutral"}>
                    {evidence.replayed ? "Replay confirmed" : "Single effect"}
                  </StatusPill>
                </div>
                <p className="muted">Thread ID: {evidence.threadId}</p>
                <p className="muted">Request ID: {evidence.requestId}</p>
                <p className="muted">Idempotency key: {evidence.idempotencyKey}</p>
                <p className="muted">Audit events returned: {evidence.auditEventCount}</p>
              </div>
            ) : (
              <InsightCallout
                title="No mutation evidence captured yet"
                body="Create or update a thread to surface request details, replay state, and audit evidence."
                tone="neutral"
              />
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
