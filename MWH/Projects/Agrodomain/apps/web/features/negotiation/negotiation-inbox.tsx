"use client";

import type {
  MarketplaceNegotiationIntelligenceRead,
  NegotiationConfirmationApproveInput,
  NegotiationConfirmationRejectInput,
  NegotiationConfirmationRequestInput,
  NegotiationCounterInput,
  NegotiationCreateInput,
  NegotiationMessage,
  NegotiationThreadRead,
} from "@agrodomain/contracts";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useMemo, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { ConversationList } from "@/components/marketplace/conversation-list";
import { NegotiationThread } from "@/components/marketplace/negotiation-thread";
import { EmptyState, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { deriveNegotiationThreadUiState } from "@/features/negotiation/thread-state";
import type { EscrowReadModel } from "@/features/wallet/model";
import { auditApi } from "@/lib/api/audit";
import { marketplaceApi } from "@/lib/api/marketplace";
import { walletApi } from "@/lib/api/wallet";
import { recordTelemetry } from "@/lib/telemetry/client";
import { recordMarketplaceConversion } from "@/lib/telemetry/marketplace";

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

function formatActorLabel(actorId: string): string {
  return actorId
    .replace(/^actor[-_]/u, "")
    .replace(/[-_]/gu, " ")
    .replace(/\b\w/gu, (char) => char.toUpperCase());
}

function threadTitle(thread: NegotiationThreadRead, actorId: string): string {
  const counterpart = thread.seller_actor_id === actorId ? thread.buyer_actor_id : thread.seller_actor_id;
  return `${thread.listing_id} with ${formatActorLabel(counterpart)}`;
}

function mutationErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "thread_closed":
      return "This negotiation is already closed, so no more offer changes can be made.";
    case "confirmation_checkpoint_missing":
      return "This action is only available when a confirmation request is still pending.";
    case "policy_denied":
      return "You do not have permission to take that action on this negotiation.";
    case "thread_not_found":
      return "This conversation is no longer available to you or may have been removed.";
    case "listing_not_found":
      return "That listing is not currently available to buyers.";
    default:
      return errorCode;
  }
}

function conversionStageForAction(actionLabel: string) {
  switch (actionLabel) {
    case "Offer created":
      return "offer_created" as const;
    case "Counter committed":
      return "offer_countered" as const;
    case "Confirmation requested":
      return "confirmation_requested" as const;
    case "Confirmation approved":
      return "confirmation_approved" as const;
    case "Confirmation rejected":
      return "confirmation_rejected" as const;
    default:
      return "negotiation_opened" as const;
  }
}

async function loadAuditEvidence(requestId: string, idempotencyKey: string, traceId: string): Promise<number> {
  const audit = await auditApi.getEvents(requestId, idempotencyKey, traceId);
  return audit.data.items.length;
}

function optimisticMessage(params: {
  action: NegotiationMessage["action"];
  actorId: string;
  amount?: number;
  currency?: string;
  note?: string;
}): NegotiationMessage {
  return {
    schema_version: "2026-04-18.wave1",
    actor_id: params.actorId,
    action: params.action,
    amount: typeof params.amount === "number" ? params.amount : null,
    currency: params.currency ?? null,
    note: params.note ?? null,
    created_at: new Date().toISOString(),
  };
}

const negotiationPageCopy = {
  title: "Keep every negotiation moving toward a clear outcome",
  body: "Review conversations, compare offer detail, and see what happens next before you accept, counter, decline, or move to payment.",
};

export function NegotiationInboxClient(props: NegotiationInboxClientProps) {
  const { session, traceId } = useAppState();
  const router = useRouter();
  const [threads, setThreads] = useState<NegotiationThreadRead[]>([]);
  const [escrows, setEscrows] = useState<EscrowReadModel[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState(props.initialThreadId ?? "");
  const [selectedThread, setSelectedThread] = useState<NegotiationThreadRead | null>(null);
  const [selectedThreadIntelligence, setSelectedThreadIntelligence] = useState<MarketplaceNegotiationIntelligenceRead | null>(null);
  const [conversationQuery, setConversationQuery] = useState("");
  const [threadError, setThreadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);
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
  const [escrowNote, setEscrowNote] = useState("Reserve funds for this accepted marketplace deal.");

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
    setCreateOffer((current) => ({
      ...current,
      listingId: props.initialListingId ?? current.listingId,
    }));
  }, [props.initialListingId, session]);

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
    recordMarketplaceConversion({
      actorId: session.actor.actor_id,
      actorRole: session.actor.role,
      countryCode: session.actor.country_code,
      listingId:
        selectedThread?.listing_id ??
        (createOffer.listingId.trim().length > 0 ? createOffer.listingId : null),
      notificationCount: selectedThread ? 1 : null,
      outcome: "completed",
      sourceSurface: "negotiation_inbox",
      stage: "negotiation_opened",
      threadId: selectedThreadId || null,
      traceId,
      urgency:
        selectedThread?.status === "rejected"
          ? "critical"
          : selectedThread?.status === "accepted"
            ? "urgent"
            : selectedThread?.status === "pending_confirmation"
            ? "attention"
            : "routine",
    });
  }, [
    createOffer.listingId,
    selectedThread?.listing_id,
    selectedThread?.status,
    selectedThreadId,
    session,
    threads.length,
    traceId,
  ]);

  useEffect(() => {
    if (!session || !selectedThread) {
      return;
    }
    recordTelemetry({
      event: "marketplace_conversion_step",
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      detail: {
        actor_role: session.actor.role,
        flow: "negotiation_thread",
        selected_thread_id: selectedThread.thread_id,
        thread_status: selectedThread.status,
      },
    });
  }, [selectedThread, session, traceId]);

  const filteredThreads = useMemo(() => {
    const normalizedQuery = conversationQuery.trim().toLowerCase();
    if (!normalizedQuery || !session) {
      return threads;
    }
    return threads.filter((thread) =>
      [thread.listing_id, threadTitle(thread, session.actor.actor_id), formatActorLabel(thread.buyer_actor_id), formatActorLabel(thread.seller_actor_id)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversationQuery, session, threads]);

  if (!session) {
    return null;
  }

  const activeSession = session;
  const threadUiState = selectedThread
    ? deriveNegotiationThreadUiState(selectedThread, activeSession.actor.actor_id)
    : null;
  const selectedEscrow = selectedThread
    ? escrows.find((escrow) => escrow.thread_id === selectedThread.thread_id) ?? null
    : null;

  async function refreshInbox(preferredThreadId = selectedThreadId): Promise<void> {
    setIsLoadingInbox(true);
    try {
      const [threadsResponse, escrowsResponse] = await Promise.all([
        marketplaceApi.listNegotiations(traceId),
        walletApi.listEscrows(traceId),
      ]);
      const items = threadsResponse.data.items;
      setThreads(items);
      setEscrows(escrowsResponse.data.items);
      setMutationError(null);
      setEscrowError(null);

      const nextThreadId = preferredThreadId || items[0]?.thread_id || "";
      setSelectedThreadId(nextThreadId);

      if (nextThreadId) {
        await loadThread(nextThreadId);
      } else {
        setSelectedThread(null);
        setSelectedThreadIntelligence(null);
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
      const [response, intelligenceResponse] = await Promise.all([
        marketplaceApi.getNegotiationThread(threadId, traceId),
        marketplaceApi.getNegotiationIntelligence(threadId, traceId).catch(() => null),
      ]);
      setSelectedThread(response.data);
      setSelectedThreadIntelligence(intelligenceResponse?.data ?? null);
      setThreadError(null);
      setCounterOffer((current) => ({
        ...current,
        offerAmount: response.data.current_offer_amount.toString(),
        offerCurrency: response.data.current_offer_currency,
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "Unable to load negotiation thread.";
      setSelectedThread(null);
      setSelectedThreadIntelligence(null);
      setThreadError(code);
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function handleInitiateEscrow(): Promise<void> {
    if (!selectedThread || selectedThread.status !== "accepted") {
      return;
    }

    setIsMutating(true);
    setEscrowError(null);
    const startedAt = performance.now();

    try {
      const response = await walletApi.initiateEscrow(
        {
          thread_id: selectedThread.thread_id,
          note: optionalNote(escrowNote),
        },
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      const auditEventCount = await loadAuditEvidence(response.data.request_id, response.data.idempotency_key, traceId);
      setEvidence({
        actionLabel: "Escrow created",
        auditEventCount,
        idempotencyKey: response.data.idempotency_key,
        replayed: response.data.replayed,
        requestId: response.data.request_id,
        threadId: response.data.escrow.thread_id,
      });
      await refreshInbox(selectedThread.thread_id);
      recordTelemetry({
        event: "negotiation_escrow_initiated",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          duration_ms: Math.round(performance.now() - startedAt),
          escrow_id: response.data.escrow.escrow_id,
          thread_id: selectedThread.thread_id,
        },
      });
      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        countryCode: activeSession.actor.country_code,
        durationMs: performance.now() - startedAt,
        escrowId: response.data.escrow.escrow_id,
        listingId: selectedThread.listing_id,
        outcome: "completed",
        replayed: response.data.replayed,
        sourceSurface: "negotiation_inbox",
        stage: "escrow_initiated",
        threadId: selectedThread.thread_id,
        traceId,
        urgency: "attention",
      });
    } catch (error) {
      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        blockerCode:
          error instanceof Error ? error.message : "escrow_initiate_failed",
        countryCode: activeSession.actor.country_code,
        listingId: selectedThread.listing_id,
        outcome: "blocked",
        sourceSurface: "negotiation_inbox",
        stage: "escrow_initiated",
        threadId: selectedThread.thread_id,
        traceId,
        urgency: "urgent",
      });
      setEscrowError(error instanceof Error ? error.message : "Unable to create escrow for this negotiation.");
    } finally {
      setIsMutating(false);
    }
  }

  function syncOptimisticThread(thread: NegotiationThreadRead) {
    setSelectedThreadId(thread.thread_id);
    setSelectedThread(thread);
    setThreads((current) => {
      const next = current.filter((item) => item.thread_id !== thread.thread_id);
      return [thread, ...next];
    });
  }

  async function runMutation(
    actionLabel: string,
    run: () => Promise<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>,
    optimisticThread?: NegotiationThreadRead,
  ): Promise<void> {
    const previousThreads = threads;
    const previousSelectedThread = selectedThread;
    const previousSelectedThreadId = selectedThreadId;

    setIsMutating(true);
    setMutationError(null);
    const startedAt = performance.now();

    if (optimisticThread) {
      syncOptimisticThread(optimisticThread);
    }

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
      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        countryCode: activeSession.actor.country_code,
        durationMs: performance.now() - startedAt,
        listingId: response.thread.listing_id,
        outcome: "completed",
        replayed: response.replayed,
        sourceSurface: "negotiation_inbox",
        stage: conversionStageForAction(actionLabel),
        threadId: response.thread.thread_id,
        traceId,
        urgency:
          response.thread.status === "rejected"
            ? "critical"
            : response.thread.status === "pending_confirmation"
              ? "attention"
              : response.thread.status === "accepted"
                ? "urgent"
                : "routine",
      });
    } catch (error) {
      setThreads(previousThreads);
      setSelectedThread(previousSelectedThread);
      setSelectedThreadId(previousSelectedThreadId);

      const code = error instanceof Error ? error.message : "negotiation_request_failed";
      setMutationError(mutationErrorMessage(code));
      recordTelemetry({
        event: "negotiation_submit_failure",
        trace_id: traceId,
        timestamp: new Date().toISOString(),
        detail: {
          action: actionLabel,
          error_code: code,
          selected_thread_id: previousSelectedThreadId || "none",
        },
      });
      recordMarketplaceConversion({
        actorId: activeSession.actor.actor_id,
        actorRole: activeSession.actor.role,
        blockerCode: code,
        countryCode: activeSession.actor.country_code,
        listingId:
          previousSelectedThread?.listing_id ??
          (createOffer.listingId.trim().length > 0 ? createOffer.listingId : null),
        outcome: "blocked",
        sourceSurface: "negotiation_inbox",
        stage: conversionStageForAction(actionLabel),
        threadId: previousSelectedThreadId || null,
        traceId,
        urgency: "urgent",
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

    const timestamp = new Date().toISOString();
    const pendingThread: NegotiationThreadRead = {
      schema_version: "2026-04-18.wave1",
      thread_id: `pending-${Date.now()}`,
      listing_id: input.listing_id,
      seller_actor_id: "actor-counterparty",
      buyer_actor_id: activeSession.actor.actor_id,
      country_code: activeSession.actor.country_code,
      status: "open",
      current_offer_amount: input.offer_amount,
      current_offer_currency: input.offer_currency,
      last_action_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
      confirmation_checkpoint: null,
      messages: [
        optimisticMessage({
          action: "offer_created",
          actorId: activeSession.actor.actor_id,
          amount: input.offer_amount,
          currency: input.offer_currency,
          note: input.note,
        }),
      ],
    };

    await runMutation(
      "Offer created",
      async () => {
        const response = await marketplaceApi.createNegotiation(
          input,
          traceId,
          activeSession.actor.actor_id,
          activeSession.actor.country_code,
        );
        return response.data;
      },
      pendingThread,
    );
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

    const optimisticThread: NegotiationThreadRead = {
      ...selectedThread,
      current_offer_amount: input.offer_amount,
      current_offer_currency: input.offer_currency,
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        ...selectedThread.messages,
        optimisticMessage({
          action: "offer_countered",
          actorId: activeSession.actor.actor_id,
          amount: input.offer_amount,
          currency: input.offer_currency,
          note: input.note,
        }),
      ],
    };

    await runMutation("Counter committed", async () => {
      const response = await marketplaceApi.counterNegotiation(
        input,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      return response.data;
    }, optimisticThread);
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

    const optimisticThread: NegotiationThreadRead = {
      ...selectedThread,
      status: "pending_confirmation",
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmation_checkpoint: {
        requested_by_actor_id: activeSession.actor.actor_id,
        required_confirmer_actor_id: requiredConfirmerActorId,
        requested_at: new Date().toISOString(),
        note: input.note ?? null,
      },
      messages: [
        ...selectedThread.messages,
        optimisticMessage({
          action: "confirmation_requested",
          actorId: activeSession.actor.actor_id,
          note: input.note,
        }),
      ],
    };

    await runMutation("Confirmation requested", async () => {
      const response = await marketplaceApi.requestNegotiationConfirmation(
        input,
        traceId,
        activeSession.actor.actor_id,
        activeSession.actor.country_code,
      );
      return response.data;
    }, optimisticThread);
  }

  async function submitConfirmationDecision(decision: "approve" | "reject"): Promise<void> {
    if (!selectedThread) {
      return;
    }

    const baseInput = {
      thread_id: selectedThread.thread_id,
      note: optionalNote(confirmationDecisionNote),
    };

    const optimisticThread: NegotiationThreadRead = {
      ...selectedThread,
      status: decision === "approve" ? "accepted" : "rejected",
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmation_checkpoint: null,
      messages: [
        ...selectedThread.messages,
        optimisticMessage({
          action: decision === "approve" ? "confirmation_approved" : "confirmation_rejected",
          actorId: activeSession.actor.actor_id,
          note: baseInput.note,
        }),
      ],
    };

    await runMutation(
      decision === "approve" ? "Confirmation approved" : "Confirmation rejected",
      async () => {
        const response =
          decision === "approve"
            ? await marketplaceApi.approveNegotiationConfirmation(
                baseInput as NegotiationConfirmationApproveInput,
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              )
            : await marketplaceApi.rejectNegotiationConfirmation(
                baseInput as NegotiationConfirmationRejectInput,
                traceId,
                activeSession.actor.actor_id,
                activeSession.actor.country_code,
              );
        return response.data;
      },
      optimisticThread,
    );
  }

  function handleBackToList() {
    setSelectedThreadId("");
    setSelectedThread(null);
    setThreadError(null);
    if (props.initialThreadId) {
      router.push("/app/market/negotiations");
    }
  }

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
          <StatusPill tone={evidence ? "online" : "degraded"}>{evidence ? "Latest update captured" : "Awaiting action"}</StatusPill>
        </div>
        <div className="hero-kpi-grid" aria-label="Negotiation posture">
          <article className="hero-kpi">
            <span className="metric-label">Conversations</span>
            <strong>{threads.length}</strong>
            <p className="muted">Search and sort through active buying and selling discussions from one view.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Offer detail</span>
            <strong>{selectedThread ? threadUiState?.statusLabel : "Choose a conversation"}</strong>
            <p className="muted">The thread view shifts based on the live state of the deal.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">What happens next</span>
            <strong>{selectedThread ? threadUiState?.nextActionLabel : "Open a conversation"}</strong>
            <p className="muted">Stay clear on the next customer-facing step before you move the deal forward.</p>
          </article>
        </div>
      </SurfaceCard>

      {mutationError ? (
        <SurfaceCard>
          <SectionHeading eyebrow="Action blocked" title="The action could not be completed" body={mutationError} />
        </SurfaceCard>
      ) : null}

      {threadError ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Thread error"
            title={threadError === "thread_not_found" ? "This conversation is no longer available" : "The conversation could not be loaded"}
            body={mutationErrorMessage(threadError)}
          />
        </SurfaceCard>
      ) : null}

      {activeSession.actor.role === "buyer" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="New buyer offer"
            title="Open a negotiation from a listing reference"
            body="Start the conversation with a clear amount and note so the seller can respond without guesswork."
          />
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void submitCreateOffer();
            }}
          >
            <div className="grid-two">
              <div className="field">
                <label htmlFor="listing-id">Listing ID</label>
                <input
                  className="ds-input"
                  id="listing-id"
                  value={createOffer.listingId}
                  onChange={(event) =>
                    setCreateOffer((current) => ({ ...current, listingId: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="offer-amount">Offer amount</label>
                <input
                  className="ds-input"
                  id="offer-amount"
                  step="0.01"
                  type="number"
                  value={createOffer.offerAmount}
                  onChange={(event) =>
                    setCreateOffer((current) => ({ ...current, offerAmount: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid-two">
              <div className="field">
                <label htmlFor="offer-currency">Currency</label>
                <input
                  className="ds-input"
                  id="offer-currency"
                  value={createOffer.offerCurrency}
                  onChange={(event) =>
                    setCreateOffer((current) => ({ ...current, offerCurrency: event.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="offer-note">Buyer note</label>
                <textarea
                  className="ds-input ds-textarea"
                  id="offer-note"
                  rows={3}
                  value={createOffer.note}
                  onChange={(event) => setCreateOffer((current) => ({ ...current, note: event.target.value }))}
                />
              </div>
            </div>
            <div className="actions-row">
              <button className="button-primary" disabled={isMutating} type="submit">
                {isMutating ? "Sending offer..." : "Send opening offer"}
              </button>
            </div>
          </form>
        </SurfaceCard>
      ) : null}

      {!isLoadingInbox && threads.length === 0 ? (
        <SurfaceCard>
          <EmptyState
            title="No visible threads yet"
            body="Create an offer from a published lot or wait for the counterparty to start the thread."
          />
        </SurfaceCard>
      ) : null}

      <div className={`negotiation-chat-layout ${selectedThread ? "has-selection" : "no-selection"}`}>
        <ConversationList
          actorId={activeSession.actor.actor_id}
          query={conversationQuery}
          selectedThreadId={selectedThreadId}
          threads={filteredThreads}
          onQueryChange={setConversationQuery}
          onSelectThread={(threadId) => {
            setSelectedThreadId(threadId);
            void loadThread(threadId);
          }}
          renderTitle={(thread) => threadTitle(thread, activeSession.actor.actor_id)}
        />

        <NegotiationThread
          actorId={activeSession.actor.actor_id}
          actorName={activeSession.actor.display_name}
          confirmationDecisionNote={confirmationDecisionNote}
          confirmationRequestNote={confirmationRequestNote}
          counterCurrency={counterOffer.offerCurrency}
          counterNote={counterOffer.note}
          counterValue={counterOffer.offerAmount}
          escrowError={escrowError}
          escrowNote={escrowNote}
          escrowRecord={selectedEscrow}
          intelligence={selectedThreadIntelligence}
          isLoadingThread={isLoadingThread}
          isMutating={isMutating}
          onApprovalNoteChange={setConfirmationDecisionNote}
          onBackToList={handleBackToList}
          onConfirmationNoteChange={setConfirmationRequestNote}
          onCounterCurrencyChange={(value) =>
            setCounterOffer((current) => ({ ...current, offerCurrency: value }))
          }
          onCounterNoteChange={(value) => setCounterOffer((current) => ({ ...current, note: value }))}
          onCounterValueChange={(value) =>
            setCounterOffer((current) => ({ ...current, offerAmount: value }))
          }
          onEscrowInitiate={() => void handleInitiateEscrow()}
          onEscrowNoteChange={setEscrowNote}
          onReject={() => submitConfirmationDecision("reject")}
          onRequestConfirmation={submitConfirmationRequest}
          onSubmitCounter={submitCounterOffer}
          onApprove={() => submitConfirmationDecision("approve")}
          thread={selectedThread}
          threadTitle={selectedThread ? threadTitle(selectedThread, activeSession.actor.actor_id) : null}
          uiState={threadUiState}
        />
      </div>

      {evidence ? (
        <SurfaceCard>
          <InsightCallout
            title={evidence.actionLabel}
            body={`The latest negotiation update was saved successfully. Reference ${evidence.requestId} is available if support needs to review the record.`}
            tone="brand"
          />
        </SurfaceCard>
      ) : null}
    </div>
  );
}
