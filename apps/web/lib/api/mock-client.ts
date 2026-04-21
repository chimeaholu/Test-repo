import type {
  ActorRole,
  ConsentCapturePayload,
  CreateListingResult,
  FinanceDecision,
  FinanceDecisionInput,
  FinancePartnerRequest,
  FinancePartnerRequestInput,
  IdentitySession,
  InsurancePayoutEvent,
  InsuranceTriggerEvaluation,
  InsuranceTriggerEvaluationInput,
  ListingCollection,
  ListingCreateInput,
  ListingRecord,
  ListingUpdateInput,
  NegotiationConfirmationApproveInput,
  NegotiationConfirmationRejectInput,
  NegotiationConfirmationRequestInput,
  NegotiationCounterInput,
  NegotiationCreateInput,
  NegotiationThreadCollection,
  NegotiationThreadRead,
  OfflineMutationPayload,
  OfflineQueueItem,
  OfflineQueueSnapshot,
  ProtectedActionStatus,
  ResponseEnvelope,
  SignInPayload,
  UpdateListingResult,
} from "@agrodomain/contracts";
import {
  advisoryConversationCollectionSchema,
  climateAlertAcknowledgementSchema,
  climateAlertSchema,
  climateDegradedModeSchema,
  consignmentSchema,
  evidenceAttachmentSchema,
  financeDecisionSchema,
  financePartnerRequestSchema,
  insurancePayoutEventSchema,
  insuranceTriggerEvaluationSchema,
  mrvEvidenceRecordSchema,
  schemaVersion,
  traceabilityEventSchema,
} from "@agrodomain/contracts";
import { z } from "zod";

import { deriveHandoffChannel, resolveFeatureGate } from "@/lib/runtime-config";

const SESSION_KEY = "agrodomain.session.v2";
const TOKEN_KEY = "agrodomain.session-token.v1";
const QUEUE_KEY = "agrodomain.offline-queue.v1";
const CLIMATE_ALERT_ACK_KEY = "agrodomain.climate.alert-acks.v1";

function nowIso(): string {
  return new Date().toISOString();
}

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_AGRO_API_BASE_URL ?? "http://127.0.0.1:8000";
}

function responseEnvelope<TData>(data: TData, traceId: string): ResponseEnvelope<TData> {
  return {
    metadata: {
      causation_id: `web-client:${traceId}`,
      correlation_id: traceId,
      emitted_at: nowIso(),
      request_id: traceId,
      schema_version: schemaVersion,
    },
    status: "completed",
    data,
  };
}

type AdvisoryConversationCollection = z.infer<typeof advisoryConversationCollectionSchema>;
type ClimateAlert = z.infer<typeof climateAlertSchema>;
type ClimateAlertAcknowledgement = z.infer<typeof climateAlertAcknowledgementSchema>;
type ClimateDegradedMode = z.infer<typeof climateDegradedModeSchema>;
type MrvEvidenceRecord = z.infer<typeof mrvEvidenceRecordSchema>;
type AdvisoryRuntimeMode = "live" | "fallback";
type ClimateRuntimeSnapshot = {
  runtime_mode: AdvisoryRuntimeMode;
  alerts: ClimateAlert[];
  degraded_modes: ClimateDegradedMode[];
  evidence_records: MrvEvidenceRecord[];
};

type ClimateAlertApiRecord = {
  alert_id: string;
  farm_id?: string;
  severity: string;
  headline?: string;
  detail?: string;
  status?: string;
  degraded_mode?: boolean;
  observation_id?: string | null;
  created_at: string;
};

type ClimateDegradedModeApiRecord = {
  source_window_id: string;
  country_code: string;
  farm_profile_id: string;
  degraded_mode: true;
  reason_code: string;
  assumptions: string[];
  source_ids?: string[];
  detected_at: string;
};

type MrvEvidenceApiRecord = {
  evidence_id: string;
  farm_id?: string;
  farm_profile_id?: string;
  country_code: string;
  method_tag: string;
  assumptions?: string[];
  assumption_notes?: string[];
  provenance?: Array<Record<string, unknown>>;
  source_references?: Array<Record<string, unknown>>;
  method_references?: string[];
  source_completeness_state?: string;
  source_completeness?: string;
  degraded_mode?: boolean;
  created_at: string;
};

type WorkflowCommandResponse<TResult> = {
  status: string;
  request_id: string;
  idempotency_key: string;
  result: TResult;
  audit_event_id: number;
  replayed: boolean;
};

type ConsignmentDetailResponse = {
  schema_version: string;
  consignment: unknown;
  timeline: unknown[];
  evidence_attachments?: unknown[];
};

type WalletWorkspaceResponse = {
  generated_at: string;
  actor_id: string;
  country_code: string;
  wallet: {
    currency: string;
    balance: {
      wallet_id: string;
      available_balance: number;
      held_balance: number;
      total_balance: number;
      balance_version: number;
      last_entry_sequence: number;
      updated_at: string | null;
    };
    entries: Array<{
      entry_id: string;
      direction: string;
      reason: string;
      amount: number;
      available_delta: number;
      held_delta: number;
      escrow_id: string | null;
      created_at: string | null;
    }>;
  };
  escrow: {
    escrows: Array<{
      escrow_id: string;
      thread_id: string;
      listing_id: string;
      buyer_actor_id: string;
      seller_actor_id: string;
      currency: string;
      amount: number;
      state: string;
      partner_reason_code: string | null;
      created_at: string | null;
      updated_at: string | null;
      funded_at: string | null;
      released_at: string | null;
      reversed_at: string | null;
      disputed_at: string | null;
      timeline: Array<{
        escrow_id: string;
        actor_id: string;
        transition: string;
        state: string;
        note: string | null;
        request_id: string;
        notification?: Record<string, unknown> | null;
        created_at: string | null;
      }>;
    }>;
    candidates: Array<{
      thread_id: string;
      listing_id: string;
      current_offer_amount: number;
      current_offer_currency: string;
      counterparty_actor_id: string;
      last_action_at: string | null;
    }>;
  };
};

type NotificationCenterResponse = {
  generated_at: string;
  unread_count: number;
  items: Array<{
    notification_id: string;
    kind: string;
    title: string;
    body: string;
    delivery_state: string;
    route: string;
    ack_state: string;
    created_at: string | null;
    metadata?: Record<string, unknown>;
  }>;
};

const advisoryLocales = ["en-GH", "fr-CI", "sw-KE"] as const;

function resolveSupportedLocale(locale: string | null | undefined): string {
  if (!locale) {
    return "en-GH";
  }
  if (advisoryLocales.includes(locale as (typeof advisoryLocales)[number])) {
    return locale;
  }

  const language = locale.split("-")[0];
  const languageMatch = advisoryLocales.find((candidate) => candidate.startsWith(`${language}-`));
  return languageMatch ?? "en-GH";
}

function unwrapCollection<TItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) {
    return value as TItem[];
  }
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: TItem[] }).items;
  }
  return [];
}

function normalizeClimateAlert(
  value: ClimateAlertApiRecord,
  locale: string,
): ClimateAlert {
  let severity = value.severity;
  if (severity === "high") {
    severity = "warning";
  }
  if (severity === "low") {
    severity = "info";
  }
  return climateAlertSchema.parse({
    schema_version: schemaVersion,
    alert_id: value.alert_id,
    farm_profile_id: value.farm_id ?? value.alert_id,
    country_code: locale.endsWith("-GH") ? "GH" : locale.split("-")[1] ?? "GH",
    locale,
    severity,
    title: value.headline ?? "Climate alert",
    summary: value.detail ?? "Climate alert detail is available in the live runtime.",
    source_ids: value.observation_id ? [value.observation_id] : [value.alert_id],
    degraded_mode: Boolean(value.degraded_mode),
    acknowledged: value.status === "acknowledged",
    created_at: value.created_at,
  });
}

function normalizeClimateDegradedMode(value: ClimateDegradedModeApiRecord): ClimateDegradedMode {
  return climateDegradedModeSchema.parse({
    schema_version: schemaVersion,
    source_window_id: value.source_window_id,
    country_code: value.country_code,
    farm_profile_id: value.farm_profile_id,
    degraded_mode: true,
    reason_code: value.reason_code,
    assumptions: value.assumptions,
    source_ids: value.source_ids ?? [],
    detected_at: value.detected_at,
  });
}

function normalizeMrvEvidence(value: MrvEvidenceApiRecord): MrvEvidenceRecord {
  const sourceReferences = Array.isArray(value.source_references)
    ? value.source_references
    : Array.isArray(value.provenance)
      ? value.provenance.map((item, index) => ({
          source_id: String(item.source_id ?? item.observation_id ?? `${value.evidence_id}-source-${index + 1}`),
          title: String(item.title ?? `Climate source ${index + 1}`),
          method_reference: String(
            item.method_reference ??
              value.method_references?.[index] ??
              value.method_references?.[0] ??
              value.method_tag,
          ),
        }))
      : [];

  return mrvEvidenceRecordSchema.parse({
    schema_version: schemaVersion,
    evidence_id: value.evidence_id,
    farm_profile_id: value.farm_profile_id ?? value.farm_id ?? value.evidence_id,
    country_code: value.country_code,
    method_tag: value.method_tag,
    assumption_notes: value.assumption_notes ?? value.assumptions ?? [],
    source_references:
      sourceReferences.length > 0
        ? sourceReferences
        : [
            {
              source_id: `${value.evidence_id}-source-1`,
              title: `Climate source ${value.evidence_id}`,
              method_reference: value.method_references?.[0] ?? value.method_tag,
            },
          ],
    source_completeness:
      value.source_completeness === "complete" || value.source_completeness_state === "complete"
        ? "complete"
        : "degraded",
    created_at: value.created_at,
  });
}

function queueEnvelope(
  actorIdValue: string,
  countryCode: string,
  payload: OfflineMutationPayload,
  traceId: string,
) {
  const idempotencyKey = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  return {
    metadata: {
      actor_id: actorIdValue,
      channel: "pwa" as const,
      correlation_id: traceId || requestId,
      country_code: countryCode,
      idempotency_key: idempotencyKey,
      occurred_at: nowIso(),
      request_id: requestId,
      schema_version: schemaVersion as typeof schemaVersion,
      traceability: {
        data_check_ids: ["offline_queue"],
        journey_ids: [`offline:${payload.workflow_id}`],
      },
    },
    command: {
      aggregate_ref: payload.workflow_id,
      mutation_scope: payload.intent,
      name: payload.intent,
      payload,
    },
  };
}

function seedQueue(session: IdentitySession, traceId: string): OfflineQueueSnapshot {
  const listingPayload: OfflineMutationPayload = {
    workflow_id: "wf-listing-001",
    intent: "market.listings.create",
    payload: { crop: "Cassava", quantity_tons: 4.2 },
  };

  const items: OfflineQueueItem[] = [
    {
      item_id: "offline-1",
      workflow_id: listingPayload.workflow_id,
      intent: listingPayload.intent,
      payload: listingPayload.payload,
      idempotency_key: crypto.randomUUID(),
      created_at: nowIso(),
      attempt_count: 0,
      state: "queued",
      last_error_code: null,
      conflict_code: null,
      result_ref: null,
      envelope: queueEnvelope(session.actor.actor_id, session.actor.country_code, listingPayload, traceId),
    },
  ];

  return {
    connectivity_state: "degraded",
    handoff_channel: deriveHandoffChannel({
      connectivityState: "degraded",
      countryCode: session.actor.country_code,
      environment: "local",
    }),
    items,
  };
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function readAcknowledgementState(): Record<string, ClimateAlertAcknowledgement> {
  return readJson<Record<string, ClimateAlertAcknowledgement>>(CLIMATE_ALERT_ACK_KEY) ?? {};
}

function writeAcknowledgementState(state: Record<string, ClimateAlertAcknowledgement>): void {
  writeJson(CLIMATE_ALERT_ACK_KEY, state);
}

function readToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

function writeToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

async function requestJson<TData>(
  path: string,
  init: RequestInit,
  traceId: string,
  authenticated = false,
): Promise<ResponseEnvelope<TData>> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", traceId);
  headers.set("X-Correlation-ID", traceId);

  if (authenticated) {
    const token = readToken();
    if (!token) {
      throw new Error("Session token missing");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const message =
      typeof detail?.detail === "string"
        ? detail.detail
        : detail?.detail?.error_code || detail?.error_code || "request_failed";
    throw new Error(message);
  }

  return responseEnvelope((await response.json()) as TData, traceId);
}

function buildAdvisoryFixtures(locale: string, actorId: string): AdvisoryConversationCollection {
  const resolvedLocale = resolveSupportedLocale(locale);

  if (resolvedLocale === "fr-CI") {
    return advisoryConversationCollectionSchema.parse({
      schema_version: schemaVersion,
      items: [
        {
          schema_version: schemaVersion,
          advisory_request_id: "adv-fr-001",
          advisory_conversation_id: "conversation-fr-001",
          actor_id: actorId,
          country_code: "CI",
          locale: "fr-CI",
          topic: "Jaunissement apres forte pluie",
          question_text: "Les feuilles de manioc jaunissent apres les fortes pluies. Que faut-il verifier en premier ?",
          response_text:
            "Commencez par verifier le drainage, l'odeur du sol et les signes de pourriture des racines avant d'ajouter un intrant. Isolez les rangs touches et comparez avec une zone non inondee.",
          status: "delivered",
          confidence_band: "high",
          confidence_score: 0.88,
          grounded: true,
          citations: [
            {
              source_id: "src-ci-extension-01",
              title: "Guide manioc: drainage post-pluie",
              source_type: "extension",
              locale: "fr-CI",
              country_code: "CI",
              citation_url: "https://example.com/fr-ci-cassava-drainage",
              published_at: "2026-04-10T09:00:00.000Z",
              excerpt: "Verifier le drainage et comparer les plants en zone seche avec les plants restes dans l'eau stagnante.",
              method_tag: "extension-drainage-check",
            },
          ],
          transcript_entries: [
            {
              speaker: "user",
              message: "Les feuilles jaunissent apres la pluie.",
              captured_at: "2026-04-18T20:10:00.000Z",
              channel: "pwa",
            },
            {
              speaker: "assistant",
              message: "J'examine des sources agronomiques ivoiriennes avant de proposer des etapes.",
              captured_at: "2026-04-18T20:11:00.000Z",
              channel: "pwa",
            },
          ],
          reviewer_decision: {
            schema_version: schemaVersion,
            advisory_request_id: "adv-fr-001",
            decision_id: "review-fr-001",
            actor_id: "reviewer-fr-001",
            actor_role: "advisor",
            outcome: "approve",
            reason_code: "evidence_sufficient",
            note: "Conseil ancre dans une source locale et un seuil de confiance eleve.",
            transcript_link: "advisory://conversation-fr-001/review-fr-001",
            policy_context: {
              matched_policy: "crop_health.general",
              confidence_threshold: 0.75,
              policy_sensitive: false,
            },
            created_at: "2026-04-18T20:12:00.000Z",
          },
          source_ids: ["src-ci-extension-01"],
          model_name: "agro-advisor",
          model_version: "n4-preview",
          correlation_id: "trace-advisory-fr-001",
          request_id: "req-advisory-fr-001",
          delivered_at: "2026-04-18T20:12:30.000Z",
          created_at: "2026-04-18T20:12:00.000Z",
        },
      ],
    });
  }

  if (resolvedLocale === "sw-KE") {
    return advisoryConversationCollectionSchema.parse({
      schema_version: schemaVersion,
      items: [
        {
          schema_version: schemaVersion,
          advisory_request_id: "adv-sw-001",
          advisory_conversation_id: "conversation-sw-001",
          actor_id: actorId,
          country_code: "KE",
          locale: "sw-KE",
          topic: "Maji mengi baada ya mvua",
          question_text: "Baada ya mvua nyingi, mahindi yanaanza kuwa ya njano. Ni hatua gani salama za kwanza?",
          response_text:
            "Anza kwa kuangalia kama maji yamesimama, mizizi inanuka, au mimea dhaifu iko kwenye sehemu ya chini ya shamba. Ondoa maji yanayosimama na usiongeze mbolea mpaka hali ya udongo ijulikane.",
          status: "hitl_required",
          confidence_band: "medium",
          confidence_score: 0.61,
          grounded: true,
          citations: [
            {
              source_id: "src-ke-weather-01",
              title: "Mvua kubwa na hatari ya mizizi kuoza",
              source_type: "weather",
              locale: "sw-KE",
              country_code: "KE",
              citation_url: "https://example.com/sw-ke-rain-risk",
              published_at: "2026-04-12T08:00:00.000Z",
              excerpt: "Hatua za awali zinapaswa kuanza na ukaguzi wa maji yaliyotuama kabla ya kuongeza pembejeo.",
              method_tag: "weather-root-rot-watch",
            },
          ],
          transcript_entries: [
            {
              speaker: "user",
              message: "Mahindi yanageuka njano baada ya mvua nyingi.",
              captured_at: "2026-04-18T20:10:00.000Z",
              channel: "pwa",
            },
            {
              speaker: "reviewer",
              message: "Mkaguzi wa kibinadamu anahitajika kabla ya kuidhinisha hatua za dawa.",
              captured_at: "2026-04-18T20:12:00.000Z",
              channel: "pwa",
            },
          ],
          reviewer_decision: {
            schema_version: schemaVersion,
            advisory_request_id: "adv-sw-001",
            decision_id: "review-sw-001",
            actor_id: "reviewer-sw-001",
            actor_role: "advisor",
            outcome: "hitl_required",
            reason_code: "policy_sensitive",
            note: "Mapendekezo ya matibabu yanasubiri ukaguzi wa kibinadamu.",
            transcript_link: "advisory://conversation-sw-001/review-sw-001",
            policy_context: {
              matched_policy: "crop_health.treatment_guardrail",
              confidence_threshold: 0.75,
              policy_sensitive: true,
            },
            created_at: "2026-04-18T20:12:00.000Z",
          },
          source_ids: ["src-ke-weather-01"],
          model_name: "agro-advisor",
          model_version: "n4-preview",
          correlation_id: "trace-advisory-sw-001",
          request_id: "req-advisory-sw-001",
          delivered_at: null,
          created_at: "2026-04-18T20:12:00.000Z",
        },
      ],
    });
  }

  return advisoryConversationCollectionSchema.parse({
    schema_version: schemaVersion,
    items: [
      {
        schema_version: schemaVersion,
        advisory_request_id: "adv-en-001",
        advisory_conversation_id: "conversation-en-001",
        actor_id: actorId,
        country_code: "GH",
        locale: "en-GH",
        topic: "Waterlogged maize after heavy rain",
        question_text: "Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field?",
        response_text:
          "Check whether roots are sitting in pooled water, compare the affected rows with higher ground, and inspect for root odor before recommending fertilizer or spray. Drain standing water first and document which blocks stayed saturated.",
        status: "delivered",
        confidence_band: "high",
        confidence_score: 0.91,
        grounded: true,
        citations: [
          {
            source_id: "src-gh-extension-01",
            title: "Ghana maize drainage field note",
            source_type: "extension",
            locale: "en-GH",
            country_code: "GH",
            citation_url: "https://example.com/ghana-maize-drainage",
            published_at: "2026-04-11T08:00:00.000Z",
            excerpt: "Drainage and root inspection should happen before any nutrient correction after heavy rain.",
            method_tag: "field-drainage-triage",
          },
          {
            source_id: "src-gh-manual-02",
            title: "Waterlogging response checklist",
            source_type: "manual",
            locale: "en-GH",
            country_code: "GH",
            citation_url: "https://example.com/waterlogging-checklist",
            published_at: "2026-04-09T08:00:00.000Z",
            excerpt: "Compare affected rows with unaffected rows to separate nutrient stress from waterlogging injury.",
            method_tag: "comparison-row-check",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message: "Leaves are turning yellow after last week's heavy rain.",
            captured_at: "2026-04-18T20:05:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "assistant",
            message: "I am grounding the answer against extension guidance and weather-linked risk notes.",
            captured_at: "2026-04-18T20:08:00.000Z",
            channel: "pwa",
          },
        ],
        reviewer_decision: {
          schema_version: schemaVersion,
          advisory_request_id: "adv-en-001",
          decision_id: "review-en-001",
          actor_id: "reviewer-en-001",
          actor_role: "advisor",
          outcome: "approve",
          reason_code: "evidence_sufficient",
          note: "Grounded response cleared for delivery.",
          transcript_link: "advisory://conversation-en-001/review-en-001",
          policy_context: {
            matched_policy: "crop_health.general",
            confidence_threshold: 0.75,
            policy_sensitive: false,
          },
          created_at: "2026-04-18T20:10:00.000Z",
        },
        source_ids: ["src-gh-extension-01", "src-gh-manual-02"],
        model_name: "agro-advisor",
        model_version: "n4-preview",
        correlation_id: "trace-advisory-en-001",
        request_id: "req-advisory-en-001",
        delivered_at: "2026-04-18T20:10:30.000Z",
        created_at: "2026-04-18T20:12:00.000Z",
      },
      {
        schema_version: schemaVersion,
        advisory_request_id: "adv-en-002",
        advisory_conversation_id: "conversation-en-002",
        actor_id: actorId,
        country_code: "GH",
        locale: "en-GH",
        topic: "Possible pesticide recommendation",
        question_text: "Can I tell the farmer to apply a fungicide immediately after this rainfall pattern?",
        response_text:
          "The current draft is held because treatment guidance crosses a policy-sensitive threshold. A reviewer must confirm the disease pattern and local protocol before delivery.",
        status: "hitl_required",
        confidence_band: "medium",
        confidence_score: 0.58,
        grounded: true,
        citations: [
          {
            source_id: "src-gh-policy-03",
            title: "Treatment escalation protocol",
            source_type: "policy",
            locale: "en-GH",
            country_code: "GH",
            citation_url: "https://example.com/ghana-treatment-policy",
            published_at: "2026-04-08T08:00:00.000Z",
            excerpt: "Chemical treatment recommendations require a reviewer when disease confirmation is incomplete.",
            method_tag: "policy-treatment-escalation",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message: "Can I recommend fungicide immediately?",
            captured_at: "2026-04-18T20:12:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "reviewer",
            message: "Do not deliver until a human reviewer confirms the disease pattern.",
            captured_at: "2026-04-18T20:13:00.000Z",
            channel: "pwa",
          },
        ],
        reviewer_decision: {
          schema_version: schemaVersion,
          advisory_request_id: "adv-en-002",
          decision_id: "review-en-002",
          actor_id: "reviewer-en-002",
          actor_role: "advisor",
          outcome: "hitl_required",
          reason_code: "policy_sensitive",
          note: "Disease treatment remains blocked pending human review.",
          transcript_link: "advisory://conversation-en-002/review-en-002",
          policy_context: {
            matched_policy: "crop_health.treatment_guardrail",
            confidence_threshold: 0.75,
            policy_sensitive: true,
          },
          created_at: "2026-04-18T20:13:00.000Z",
        },
        source_ids: ["src-gh-policy-03"],
        model_name: "agro-advisor",
        model_version: "n4-preview",
        correlation_id: "trace-advisory-en-002",
        request_id: "req-advisory-en-002",
        delivered_at: null,
        created_at: "2026-04-18T20:13:00.000Z",
      },
      {
        schema_version: schemaVersion,
        advisory_request_id: "adv-en-003",
        advisory_conversation_id: "conversation-en-003",
        actor_id: actorId,
        country_code: "GH",
        locale: "en-GH",
        topic: "Unverified soil additive claim",
        question_text: "A trader says a new additive will reverse yellowing in one day. Can that advice be sent?",
        response_text:
          "No. The claim is blocked because the available sources do not verify the additive and the confidence score is below the release threshold.",
        status: "blocked",
        confidence_band: "low",
        confidence_score: 0.29,
        grounded: true,
        citations: [
          {
            source_id: "src-gh-policy-04",
            title: "Unverified input claims control",
            source_type: "policy",
            locale: "en-GH",
            country_code: "GH",
            citation_url: "https://example.com/unverified-input-claims",
            published_at: "2026-04-07T08:00:00.000Z",
            excerpt: "Advice tied to unverified commercial claims must be blocked when evidence is insufficient.",
            method_tag: "policy-unverified-input-block",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message: "A trader says a new additive will fix this in one day.",
            captured_at: "2026-04-18T20:15:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "system",
            message: "Delivery blocked because the evidence threshold was not met.",
            captured_at: "2026-04-18T20:16:00.000Z",
            channel: "pwa",
          },
        ],
        reviewer_decision: {
          schema_version: schemaVersion,
          advisory_request_id: "adv-en-003",
          decision_id: "review-en-003",
          actor_id: "reviewer-en-003",
          actor_role: "advisor",
          outcome: "block",
          reason_code: "insufficient_confidence",
          note: "Commercial efficacy claim is unsupported by vetted sources.",
          transcript_link: "advisory://conversation-en-003/review-en-003",
          policy_context: {
            matched_policy: "crop_health.claim_validation",
            confidence_threshold: 0.75,
            policy_sensitive: true,
          },
          created_at: "2026-04-18T20:16:00.000Z",
        },
        source_ids: ["src-gh-policy-04"],
        model_name: "agro-advisor",
        model_version: "n4-preview",
        correlation_id: "trace-advisory-en-003",
        request_id: "req-advisory-en-003",
        delivered_at: null,
        created_at: "2026-04-18T20:16:00.000Z",
      },
    ],
  });
}

function buildClimateFixtures(locale: string): ClimateRuntimeSnapshot {
  const resolvedLocale = resolveSupportedLocale(locale);
  const countryCode = resolvedLocale.endsWith("KE") ? "KE" : resolvedLocale.endsWith("CI") ? "CI" : "GH";
  const alertState = readAcknowledgementState();

  const alerts = [
    {
      schema_version: schemaVersion,
      alert_id: `climate-${countryCode.toLowerCase()}-001`,
      farm_profile_id: `farm-${countryCode.toLowerCase()}-001`,
      country_code: countryCode,
      locale: resolvedLocale,
      severity: "critical",
      title:
        resolvedLocale === "fr-CI"
          ? "Risque eleve de saturation du sol"
          : resolvedLocale === "sw-KE"
            ? "Hatari kubwa ya udongo kushiba maji"
            : "High soil saturation risk",
      summary:
        resolvedLocale === "fr-CI"
          ? "Deux jours de pluie continue augmentent le risque d'asphyxie racinaire dans les bas-fonds."
          : resolvedLocale === "sw-KE"
            ? "Mvua ya siku mbili imeongeza hatari ya mizizi kukosa hewa kwenye sehemu za chini."
            : "Two consecutive heavy-rain windows raise root stress risk in low-field blocks.",
      source_ids: [`source-window-${countryCode.toLowerCase()}-01`, `radar-${countryCode.toLowerCase()}-02`],
      degraded_mode: false,
      acknowledged: Boolean(alertState[`climate-${countryCode.toLowerCase()}-001`]),
      created_at: "2026-04-18T20:20:00.000Z",
    },
    {
      schema_version: schemaVersion,
      alert_id: `climate-${countryCode.toLowerCase()}-002`,
      farm_profile_id: `farm-${countryCode.toLowerCase()}-001`,
      country_code: countryCode,
      locale: resolvedLocale,
      severity: "warning",
      title:
        resolvedLocale === "fr-CI"
          ? "Fenetre meteo incomplete"
          : resolvedLocale === "sw-KE"
            ? "Dirisha la hali ya hewa halijakamilika"
            : "Weather window incomplete",
      summary:
        resolvedLocale === "fr-CI"
          ? "Les releves de pluie recents sont partiels. Traitez les recommandations comme prudentes jusqu'au prochain rafraichissement."
          : resolvedLocale === "sw-KE"
            ? "Vipimo vya mvua vya karibuni vimekatika. Tumia tahadhari hadi dirisha lijazwe tena."
            : "Recent rainfall readings are partial. Treat operational advice as reduced-confidence until the next refresh.",
      source_ids: [`source-window-${countryCode.toLowerCase()}-stale`],
      degraded_mode: true,
      acknowledged: Boolean(alertState[`climate-${countryCode.toLowerCase()}-002`]),
      created_at: "2026-04-18T20:24:00.000Z",
    },
  ];

  const degradedModes = [
    {
      schema_version: schemaVersion,
      source_window_id: `source-window-${countryCode.toLowerCase()}-stale`,
      country_code: countryCode,
      farm_profile_id: `farm-${countryCode.toLowerCase()}-001`,
      degraded_mode: true,
      reason_code: "source_window_missing",
      assumptions:
        resolvedLocale === "fr-CI"
          ? ["Les donnees radar des 6 dernieres heures sont absentes.", "La priorite est donnee au dernier releve valide."]
          : resolvedLocale === "sw-KE"
            ? ["Data ya rada ya saa 6 zilizopita haipo.", "Mfumo umetumia dirisha la mwisho lililothibitishwa."]
            : ["Radar observations for the last 6 hours are missing.", "The last verified station reading is being used as a temporary assumption."],
      source_ids: [`station-${countryCode.toLowerCase()}-01`],
      detected_at: "2026-04-18T20:24:00.000Z",
    },
  ];

  const evidenceRecords = [
    {
      schema_version: schemaVersion,
      evidence_id: `mrv-${countryCode.toLowerCase()}-001`,
      farm_profile_id: `farm-${countryCode.toLowerCase()}-001`,
      country_code: countryCode,
      method_tag: "ipcc-tier-2-soil-moisture",
      assumption_notes:
        resolvedLocale === "fr-CI"
          ? ["Le bloc nord est evalue avec la derniere mesure valide.", "Le calcul exclut les rangs non echantillonnes."]
          : resolvedLocale === "sw-KE"
            ? ["Kipande cha kaskazini kimetathminiwa kwa kipimo cha mwisho kilichothibitishwa.", "Hesabu haijumuishi mistari isiyopimwa."]
            : ["North block moisture is estimated from the last verified reading.", "The calculation excludes rows that were not sampled."],
      source_references: [
        {
          source_id: `mrv-source-${countryCode.toLowerCase()}-01`,
          title:
            resolvedLocale === "fr-CI"
              ? "Protocole humidite du sol"
              : resolvedLocale === "sw-KE"
                ? "Mwongozo wa unyevu wa udongo"
                : "Soil moisture field protocol",
          method_reference: "IPCC Tier 2 Annex 4",
        },
      ],
      source_completeness: "partial",
      created_at: "2026-04-18T20:26:00.000Z",
    },
    {
      schema_version: schemaVersion,
      evidence_id: `mrv-${countryCode.toLowerCase()}-002`,
      farm_profile_id: `farm-${countryCode.toLowerCase()}-001`,
      country_code: countryCode,
      method_tag: "field-drainage-observation",
      assumption_notes:
        resolvedLocale === "fr-CI"
          ? ["Aucune hypothese supplementaire; toutes les mesures de terrain sont completes."]
          : resolvedLocale === "sw-KE"
            ? ["Hakuna dhana ya ziada; vipimo vyote vya shambani vimekamilika."]
            : ["No additional assumptions; all field observations were captured in the latest visit."],
      source_references: [
        {
          source_id: `mrv-source-${countryCode.toLowerCase()}-02`,
          title:
            resolvedLocale === "fr-CI"
              ? "Journal de drainage terrain"
              : resolvedLocale === "sw-KE"
                ? "Kumbukumbu ya uondoaji maji shambani"
                : "Field drainage observation log",
          method_reference: "Drainage Checklist v2",
        },
      ],
      source_completeness: "complete",
      created_at: "2026-04-18T20:28:00.000Z",
    },
  ];

  return {
    runtime_mode: "fallback",
    alerts: alerts.map((item) => climateAlertSchema.parse(item)),
    degraded_modes: degradedModes.map((item) => climateDegradedModeSchema.parse(item)),
    evidence_records: evidenceRecords.map((item) => mrvEvidenceRecordSchema.parse(item)),
  };
}

export const agroApiClient = {
  async restoreSession(traceId: string): Promise<ResponseEnvelope<IdentitySession | null>> {
    const token = readToken();
    if (!token) {
      return responseEnvelope(null, traceId);
    }

    try {
      const sessionResponse = await requestJson<IdentitySession>("/api/v1/identity/session", { method: "GET" }, traceId, true);
      writeJson(SESSION_KEY, sessionResponse.data);
      return sessionResponse;
    } catch {
      writeToken(null);
      writeJson(SESSION_KEY, null);
      return responseEnvelope(null, traceId);
    }
  },

  getStoredSession(traceId: string): ResponseEnvelope<IdentitySession | null> {
    const token = readToken();
    if (!token) {
      return responseEnvelope(null, traceId);
    }
    return responseEnvelope(readJson<IdentitySession>(SESSION_KEY), traceId);
  },

  getStoredAccessToken(): string | null {
    return readToken();
  },

  async signIn(payload: SignInPayload, traceId: string): Promise<ResponseEnvelope<IdentitySession>> {
    const response = await requestJson<{ access_token: string; session: IdentitySession }>(
      "/api/v1/identity/session",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      traceId,
    );
    writeToken(response.data.access_token);
    writeJson(SESSION_KEY, response.data.session);
    writeJson(QUEUE_KEY, seedQueue(response.data.session, traceId));
    return responseEnvelope(response.data.session, traceId);
  },

  markConsentPending(traceId: string): ResponseEnvelope<IdentitySession | null> {
    const session = readJson<IdentitySession>(SESSION_KEY);
    if (!session) {
      return responseEnvelope(null, traceId);
    }
    const nextSession: IdentitySession = {
      ...session,
      consent: {
        ...session.consent,
        state: session.consent.state === "identified" ? "consent_pending" : session.consent.state,
      },
    };
    writeJson(SESSION_KEY, nextSession);
    return responseEnvelope(nextSession, traceId);
  },

  async captureConsent(
    payload: ConsentCapturePayload,
    traceId: string,
  ): Promise<ResponseEnvelope<IdentitySession | null>> {
    const response = await requestJson<IdentitySession>(
      "/api/v1/identity/consent",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      traceId,
      true,
    );
    writeJson(SESSION_KEY, response.data);
    return responseEnvelope(response.data, traceId);
  },

  async revokeConsent(reason: string, traceId: string): Promise<ResponseEnvelope<IdentitySession | null>> {
    const response = await requestJson<{ reason: string; session: IdentitySession }>(
      "/api/v1/identity/consent/revoke",
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
      traceId,
      true,
    );
    writeJson(SESSION_KEY, response.data.session);
    return responseEnvelope(response.data.session, traceId);
  },

  evaluateProtectedAction(traceId: string): ResponseEnvelope<ProtectedActionStatus> {
    const session = readJson<IdentitySession>(SESSION_KEY);
    const allowed = session?.consent.state === "consent_granted";
    return responseEnvelope(
      {
        allowed: Boolean(allowed),
        reason_code: !session ? "session_missing" : allowed ? "ok" : "consent_required",
      },
      traceId,
    );
  },

  async getProtectedActionStatus(traceId: string): Promise<ResponseEnvelope<ProtectedActionStatus>> {
    return requestJson<ProtectedActionStatus>("/api/v1/identity/protected-action", { method: "GET" }, traceId, true);
  },

  async createListing(
    input: ListingCreateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<CreateListingResult & { request_id: string; idempotency_key: string }>> {
    return this.sendListingCommand(
      {
        actorId,
        aggregateRef: "listing",
        countryCode,
        input,
        name: "market.listings.create",
        traceId,
      },
      traceId,
    );
  },

  async updateListing(
    input: ListingUpdateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<UpdateListingResult & { request_id: string; idempotency_key: string }>> {
    return this.sendListingCommand(
      {
        actorId,
        aggregateRef: input.listing_id,
        countryCode,
        idempotencyKey,
        input,
        name: "market.listings.update",
        traceId,
      },
      traceId,
    );
  },

  async listListings(traceId: string): Promise<ResponseEnvelope<ListingCollection>> {
    return requestJson<ListingCollection>("/api/v1/marketplace/listings", { method: "GET" }, traceId, true);
  },

  async getListing(listingId: string, traceId: string): Promise<ResponseEnvelope<ListingRecord>> {
    return requestJson<ListingRecord>(`/api/v1/marketplace/listings/${listingId}`, { method: "GET" }, traceId, true);
  },

  async listNegotiations(traceId: string): Promise<ResponseEnvelope<NegotiationThreadCollection>> {
    return requestJson<NegotiationThreadCollection>("/api/v1/marketplace/negotiations", { method: "GET" }, traceId, true);
  },

  async getNegotiationThread(threadId: string, traceId: string): Promise<ResponseEnvelope<NegotiationThreadRead>> {
    return requestJson<NegotiationThreadRead>(`/api/v1/marketplace/negotiations/${threadId}`, { method: "GET" }, traceId, true);
  },

  async createNegotiation(
    input: NegotiationCreateInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    return this.sendNegotiationCommand(
      {
        actorId,
        aggregateRef: input.listing_id,
        commandName: "market.negotiations.create",
        countryCode,
        idempotencyKey,
        input,
        traceId,
      },
      traceId,
    );
  },

  async counterNegotiation(
    input: NegotiationCounterInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    return this.sendNegotiationCommand(
      {
        actorId,
        aggregateRef: input.thread_id,
        commandName: "market.negotiations.counter",
        countryCode,
        idempotencyKey,
        input,
        traceId,
      },
      traceId,
    );
  },

  async requestNegotiationConfirmation(
    input: NegotiationConfirmationRequestInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    return this.sendNegotiationCommand(
      {
        actorId,
        aggregateRef: input.thread_id,
        commandName: "market.negotiations.confirm.request",
        countryCode,
        idempotencyKey,
        input,
        traceId,
      },
      traceId,
    );
  },

  async approveNegotiationConfirmation(
    input: NegotiationConfirmationApproveInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    return this.sendNegotiationCommand(
      {
        actorId,
        aggregateRef: input.thread_id,
        commandName: "market.negotiations.confirm.approve",
        countryCode,
        idempotencyKey,
        input,
        traceId,
      },
      traceId,
    );
  },

  async rejectNegotiationConfirmation(
    input: NegotiationConfirmationRejectInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    return this.sendNegotiationCommand(
      {
        actorId,
        aggregateRef: input.thread_id,
        commandName: "market.negotiations.confirm.reject",
        countryCode,
        idempotencyKey,
        input,
        traceId,
      },
      traceId,
    );
  },

  async getAuditEvents(
    requestId: string,
    idempotencyKey: string,
    traceId: string,
  ): Promise<ResponseEnvelope<{ items: Array<Record<string, unknown>> }>> {
    const params = new URLSearchParams({ request_id: requestId, idempotency_key: idempotencyKey });
    return requestJson<{ items: Array<Record<string, unknown>> }>(
      `/api/v1/audit/events?${params.toString()}`,
      { method: "GET" },
      traceId,
      true,
    );
  },

  async listAdvisoryConversations(
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<AdvisoryConversationCollection & { runtime_mode: AdvisoryRuntimeMode }>> {
    const session = readJson<IdentitySession | null>(SESSION_KEY);
    const resolvedLocale = resolveSupportedLocale(locale ?? session?.actor.locale);

    try {
      const params = new URLSearchParams({ locale: resolvedLocale });
      const response = await requestJson<unknown>(
        `/api/v1/advisory/conversations?${params.toString()}`,
        { method: "GET" },
        traceId,
        true,
      );
      const parsed = advisoryConversationCollectionSchema.parse(response.data);
      if (parsed.items.length === 0) {
        throw new Error("n4_advisory_runtime_empty");
      }
      return responseEnvelope({ ...parsed, runtime_mode: "live" }, traceId);
    } catch {
      const fallback = buildAdvisoryFixtures(resolvedLocale, session?.actor.actor_id ?? "actor-advisory-preview");
      return responseEnvelope({ ...fallback, runtime_mode: "fallback" }, traceId);
    }
  },

  async listClimateRuntime(
    traceId: string,
    locale?: string | null,
  ): Promise<ResponseEnvelope<ClimateRuntimeSnapshot>> {
    const session = readJson<IdentitySession | null>(SESSION_KEY);
    const resolvedLocale = resolveSupportedLocale(locale ?? session?.actor.locale);

    try {
      const params = new URLSearchParams({ locale: resolvedLocale });
      const [alertsResponse, degradedResponse, evidenceResponse] = await Promise.all([
        requestJson<unknown>(`/api/v1/climate/alerts?${params.toString()}`, { method: "GET" }, traceId, true),
        requestJson<unknown>(`/api/v1/climate/degraded-modes?${params.toString()}`, { method: "GET" }, traceId, true),
        requestJson<unknown>(`/api/v1/climate/mrv-evidence?${params.toString()}`, { method: "GET" }, traceId, true),
      ]);

      const alerts = unwrapCollection<ClimateAlertApiRecord>(alertsResponse.data).map((item) =>
        normalizeClimateAlert(item, resolvedLocale),
      );
      const degradedModes = unwrapCollection<ClimateDegradedModeApiRecord>(degradedResponse.data).map((item) =>
        normalizeClimateDegradedMode(item),
      );
      const evidenceRecords = unwrapCollection<MrvEvidenceApiRecord>(evidenceResponse.data).map((item) =>
        normalizeMrvEvidence(item),
      );
      if (alerts.length === 0 || evidenceRecords.length === 0) {
        throw new Error("n4_climate_runtime_empty");
      }

      return responseEnvelope(
        {
          runtime_mode: "live",
          alerts,
          degraded_modes: degradedModes,
          evidence_records: evidenceRecords,
        },
        traceId,
      );
    } catch {
      return responseEnvelope(buildClimateFixtures(resolvedLocale), traceId);
    }
  },

  async acknowledgeClimateAlert(
    alertId: string,
    actorId: string,
    traceId: string,
    note?: string,
  ): Promise<ResponseEnvelope<ClimateAlertAcknowledgement>> {
    try {
      const response = await requestJson<unknown>(
        `/api/v1/climate/alerts/${alertId}/acknowledge`,
        {
          method: "POST",
          body: JSON.stringify({
            actor_id: actorId,
            note: note ?? null,
          }),
        },
        traceId,
        true,
      );
      const parsed = climateAlertAcknowledgementSchema.parse(response.data);
      return responseEnvelope(parsed, traceId);
    } catch {
      const acknowledgement = climateAlertAcknowledgementSchema.parse({
        schema_version: schemaVersion,
        alert_id: alertId,
        actor_id: actorId,
        acknowledged_at: nowIso(),
        note: note ?? "Acknowledged from fallback climate workspace.",
      });
      writeAcknowledgementState({
        ...readAcknowledgementState(),
        [alertId]: acknowledgement,
      });
      return responseEnvelope(acknowledgement, traceId);
    }
  },

  async submitFinancePartnerRequest(
    input: FinancePartnerRequestInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<
    ResponseEnvelope<{
      finance_request: FinancePartnerRequest;
      request_id: string;
      idempotency_key: string;
      replayed: boolean;
      audit_event_id: number;
    }>
  > {
    const requestId = crypto.randomUUID();
    const response = await requestJson<
      WorkflowCommandResponse<{
        finance_request: unknown;
      }>
    >(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            country_code: countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: ["CJ-004"],
              data_check_ids: ["DI-003"],
            },
          },
          command: {
            name: "finance.partner_requests.submit",
            aggregate_ref: "finance_request",
            mutation_scope: "regulated.finance",
            payload: input,
          },
        }),
      },
      traceId,
      true,
    );
    const financeRequest = financePartnerRequestSchema.parse(response.data.result.finance_request);
    return responseEnvelope(
      {
        finance_request: financeRequest,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
        audit_event_id: response.data.audit_event_id,
      },
      traceId,
    );
  },

  async recordFinancePartnerDecision(
    input: FinanceDecisionInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<
    ResponseEnvelope<{
      finance_request: FinancePartnerRequest;
      finance_decision: FinanceDecision;
      request_id: string;
      idempotency_key: string;
      replayed: boolean;
      audit_event_id: number;
    }>
  > {
    const requestId = crypto.randomUUID();
    const response = await requestJson<
      WorkflowCommandResponse<{
        finance_request: unknown;
        finance_decision: unknown;
      }>
    >(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            country_code: countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: ["CJ-008"],
              data_check_ids: ["DI-003"],
            },
          },
          command: {
            name: "finance.partner_decisions.record",
            aggregate_ref: "finance_request",
            mutation_scope: "regulated.finance",
            payload: input,
          },
        }),
      },
      traceId,
      true,
    );
    return responseEnvelope(
      {
        finance_request: financePartnerRequestSchema.parse(response.data.result.finance_request),
        finance_decision: financeDecisionSchema.parse(response.data.result.finance_decision),
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
        audit_event_id: response.data.audit_event_id,
      },
      traceId,
    );
  },

  async evaluateInsuranceTrigger(
    input: InsuranceTriggerEvaluationInput,
    traceId: string,
    actorId: string,
    countryCode: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<
    ResponseEnvelope<{
      insurance_trigger: Record<string, unknown>;
      insurance_evaluation: InsuranceTriggerEvaluation;
      insurance_payout_event: InsurancePayoutEvent | null;
      request_id: string;
      idempotency_key: string;
      replayed: boolean;
      audit_event_id: number;
    }>
  > {
    const requestId = crypto.randomUUID();
    const response = await requestJson<
      WorkflowCommandResponse<{
        insurance_trigger: unknown;
        insurance_evaluation: unknown;
        insurance_payout_event: unknown | null;
      }>
    >(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            country_code: countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: ["EP-008"],
              data_check_ids: ["DI-006"],
            },
          },
          command: {
            name: "insurance.triggers.evaluate",
            aggregate_ref: "insurance_trigger",
            mutation_scope: "regulated.insurance",
            payload: input,
          },
        }),
      },
      traceId,
      true,
    );
    return responseEnvelope(
      {
        insurance_trigger:
          typeof response.data.result.insurance_trigger === "object" && response.data.result.insurance_trigger
            ? (response.data.result.insurance_trigger as Record<string, unknown>)
            : {},
        insurance_evaluation: insuranceTriggerEvaluationSchema.parse(response.data.result.insurance_evaluation),
        insurance_payout_event: response.data.result.insurance_payout_event
          ? insurancePayoutEventSchema.parse(response.data.result.insurance_payout_event)
          : null,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
        audit_event_id: response.data.audit_event_id,
      },
      traceId,
    );
  },

  async getConsignmentDetail(
    consignmentId: string,
    traceId: string,
  ): Promise<
    ResponseEnvelope<{
      consignment: z.infer<typeof consignmentSchema>;
      timeline: z.infer<typeof traceabilityEventSchema>[];
      evidence_attachments: z.infer<typeof evidenceAttachmentSchema>[];
      evidence_attachment_errors: string[];
    }>
  > {
    const response = await requestJson<ConsignmentDetailResponse>(
      `/api/v1/traceability/consignments/${consignmentId}`,
      { method: "GET" },
      traceId,
      true,
    );
    const timeline = Array.isArray(response.data.timeline) ? response.data.timeline : [];
    const attachmentRows = Array.isArray(response.data.evidence_attachments) ? response.data.evidence_attachments : [];
    const parsedAttachments: z.infer<typeof evidenceAttachmentSchema>[] = [];
    const attachmentErrors: string[] = [];
    attachmentRows.forEach((item, index) => {
      const parsed = evidenceAttachmentSchema.safeParse(item);
      if (parsed.success) {
        parsedAttachments.push(parsed.data);
      } else {
        attachmentErrors.push(`attachment_${index}_invalid`);
      }
    });
    return responseEnvelope(
      {
        consignment: consignmentSchema.parse(response.data.consignment),
        timeline: timeline.map((item) => traceabilityEventSchema.parse(item)),
        evidence_attachments: parsedAttachments,
        evidence_attachment_errors: attachmentErrors,
      },
      traceId,
    );
  },

  async getWalletWorkspace(traceId: string): Promise<ResponseEnvelope<WalletWorkspaceResponse>> {
    return requestJson<WalletWorkspaceResponse>("/api/v1/wallet/workspace", { method: "GET" }, traceId, true);
  },

  async initiateEscrow(threadId: string, traceId: string, note?: string): Promise<ResponseEnvelope<{
    escrow_id: string;
    state: string;
    thread_id: string;
  }>> {
    return requestJson<{ escrow_id: string; state: string; thread_id: string }>(
      "/api/v1/wallet/escrows/initiate",
      {
        method: "POST",
        body: JSON.stringify({
          thread_id: threadId,
          note: note ?? null,
        }),
      },
      traceId,
      true,
    );
  },

  async markEscrowPartnerPending(
    escrowId: string,
    traceId: string,
    pendingReasonCode: string,
    note?: string,
  ): Promise<ResponseEnvelope<{
    escrow_id: string;
    state: string;
    partner_reason_code: string | null;
  }>> {
    return requestJson<{ escrow_id: string; state: string; partner_reason_code: string | null }>(
      `/api/v1/wallet/escrows/${escrowId}/partner-pending`,
      {
        method: "POST",
        body: JSON.stringify({
          note: note ?? null,
          pending_reason_code: pendingReasonCode,
        }),
      },
      traceId,
      true,
    );
  },

  async getNotificationCenter(traceId: string): Promise<ResponseEnvelope<NotificationCenterResponse>> {
    return requestJson<NotificationCenterResponse>("/api/v1/notifications/center", { method: "GET" }, traceId, true);
  },

  getQueue(traceId: string): ResponseEnvelope<OfflineQueueSnapshot> {
    const queue = readJson<OfflineQueueSnapshot>(QUEUE_KEY) ?? {
      connectivity_state: "online",
      handoff_channel: null,
      items: [],
    };
    return responseEnvelope(queue, traceId);
  },

  storeQueue(snapshot: OfflineQueueSnapshot): void {
    writeJson(QUEUE_KEY, snapshot);
  },

  async replayOfflineQueueItem(
    item: OfflineQueueItem,
    actorRole: ActorRole,
    traceId: string,
  ): Promise<
    ResponseEnvelope<{
      error_code: string | null;
      request_id: string;
      result_ref: string | null;
      retryable: boolean;
      replayed: boolean;
    }>
  > {
    const gate = resolveFeatureGate({
      actorRole,
      channel: "pwa",
      countryCode: item.envelope.metadata.country_code,
      environment: "local",
      flagKey: "workflow.offline_backend_replay",
    });
    if (!gate.enabled) {
      throw new Error(gate.reason);
    }

    const response = await requestJson<{
      status: string;
      request_id: string;
      idempotency_key: string;
      result: Record<string, unknown>;
      error_code?: string | null;
      audit_event_id: number;
      replayed: boolean;
    }>(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        headers: {
          "X-Offline-Queue-Item-ID": item.item_id,
        },
        body: JSON.stringify(item.envelope),
      },
      traceId,
      true,
    );

    const result = response.data.result;
    const resultRef =
      typeof result.execution_id === "string"
        ? result.execution_id
        : typeof (result.listing as { listing_id?: unknown } | undefined)?.listing_id === "string"
          ? String((result.listing as { listing_id: string }).listing_id)
          : typeof (result.thread as { thread_id?: unknown } | undefined)?.thread_id === "string"
            ? String((result.thread as { thread_id: string }).thread_id)
            : typeof (result.escrow as { escrow_id?: unknown } | undefined)?.escrow_id === "string"
              ? String((result.escrow as { escrow_id: string }).escrow_id)
              : null;

    return responseEnvelope(
      {
        error_code: response.data.error_code ?? null,
        request_id: response.data.request_id,
        result_ref: resultRef,
        retryable: response.data.status !== "accepted" && response.data.status !== "replayed",
        replayed: response.data.replayed,
      },
      traceId,
    );
  },

  clear(): void {
    writeToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(QUEUE_KEY);
    }
  },

  async sendListingCommand(
    params: {
      actorId: string;
      aggregateRef: string;
      countryCode: string;
      idempotencyKey?: string;
      input: ListingCreateInput | ListingUpdateInput;
      name: "market.listings.create" | "market.listings.update";
      traceId: string;
    },
    traceId: string,
  ): Promise<
    ResponseEnvelope<
      (CreateListingResult | UpdateListingResult) & { request_id: string; idempotency_key: string }
    >
  > {
    const requestId = crypto.randomUUID();
    const idempotencyKey = params.idempotencyKey ?? crypto.randomUUID();
    const response = await requestJson<{
      status: string;
      request_id: string;
      idempotency_key: string;
      result: { schema_version: string; listing: ListingRecord };
      audit_event_id: number;
      replayed: boolean;
    }>(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: params.actorId,
            country_code: params.countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: params.traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: [params.name === "market.listings.create" ? "CJ-002" : "RJ-002"],
              data_check_ids: ["DI-001"],
            },
          },
          command: {
            name: params.name,
            aggregate_ref: params.aggregateRef,
            mutation_scope: "marketplace.listings",
            payload: params.input,
          },
        }),
      },
      traceId,
      true,
    );
    return responseEnvelope(
      {
        schema_version: schemaVersion as typeof schemaVersion,
        listing: response.data.result.listing,
        audit_event_id: response.data.audit_event_id,
        replayed: response.data.replayed,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
      },
      traceId,
    );
  },

  async getWalletSummary(traceId: string): Promise<ResponseEnvelope<{
    schema_version: string;
    actor_id: string;
    country_code: string;
    total_balance: number;
    available_balance: number;
    held_balance: number;
    currency: string;
    balance_version: number;
    updated_at: string;
  }>> {
    const workspace = await this.getWalletWorkspace(traceId);
    const b = workspace.data.wallet.balance;
    return responseEnvelope(
      {
        schema_version: schemaVersion as typeof schemaVersion,
        actor_id: workspace.data.actor_id,
        country_code: workspace.data.country_code,
        total_balance: b.total_balance,
        available_balance: b.available_balance,
        held_balance: b.held_balance,
        currency: workspace.data.wallet.currency,
        balance_version: b.balance_version,
        updated_at: b.updated_at ?? nowIso(),
      },
      traceId,
    );
  },

  async listWalletTransactions(traceId: string): Promise<ResponseEnvelope<{
    items: Array<{
      schema_version: string;
      entry_id: string;
      actor_id: string;
      escrow_id: string | null;
      direction: string;
      amount: number;
      currency: string;
      reason: string;
      entry_sequence: number;
      balance_version: number;
      resulting_available_balance: number;
      resulting_held_balance: number;
      created_at: string;
    }>;
  }>> {
    const workspace = await this.getWalletWorkspace(traceId);
    let runningAvailable = workspace.data.wallet.balance.available_balance;
    let runningHeld = workspace.data.wallet.balance.held_balance;
    const items = workspace.data.wallet.entries.map((entry, index) => {
      if (entry.direction === "credit") {
        runningAvailable += entry.amount;
      } else {
        runningAvailable -= entry.amount;
      }
      return {
        schema_version: schemaVersion as typeof schemaVersion,
        entry_id: entry.entry_id,
        actor_id: workspace.data.actor_id,
        escrow_id: entry.escrow_id,
        direction: entry.direction,
        amount: entry.amount,
        currency: workspace.data.wallet.currency,
        reason: entry.reason,
        entry_sequence: index + 1,
        balance_version: index + 1,
        resulting_available_balance: runningAvailable,
        resulting_held_balance: runningHeld,
        created_at: entry.created_at ?? nowIso(),
      };
    });
    return responseEnvelope({ items }, traceId);
  },

  async listEscrows(traceId: string): Promise<ResponseEnvelope<{
    items: Array<{
      schema_version: string;
      escrow_id: string;
      thread_id: string;
      listing_id: string;
      buyer_actor_id: string;
      seller_actor_id: string;
      country_code: string;
      amount: number;
      currency: string;
      state: string;
      partner_reason_code: string | null;
      timeline: Array<{
        entry_id: string;
        request_id: string;
        idempotency_key: string;
        actor_id: string;
        transition: string;
        state: string;
        note: string | null;
        notification: Record<string, unknown> | null;
        created_at: string;
      }>;
      created_at: string;
      updated_at: string;
    }>;
  }>> {
    const workspace = await this.getWalletWorkspace(traceId);
    const items = workspace.data.escrow.escrows.map((escrow) => ({
      schema_version: schemaVersion as typeof schemaVersion,
      escrow_id: escrow.escrow_id,
      thread_id: escrow.thread_id,
      listing_id: escrow.listing_id,
      buyer_actor_id: escrow.buyer_actor_id,
      seller_actor_id: escrow.seller_actor_id,
      country_code: workspace.data.country_code,
      amount: escrow.amount,
      currency: escrow.currency,
      state: escrow.state,
      partner_reason_code: escrow.partner_reason_code,
      timeline: escrow.timeline.map((entry) => ({
        entry_id: entry.escrow_id + "-" + entry.created_at,
        request_id: entry.request_id,
        idempotency_key: entry.request_id,
        actor_id: entry.actor_id,
        transition: entry.transition,
        state: entry.state,
        note: entry.note,
        notification: entry.notification ?? null,
        created_at: entry.created_at ?? nowIso(),
      })),
      created_at: escrow.created_at ?? nowIso(),
      updated_at: escrow.updated_at ?? nowIso(),
    }));
    return responseEnvelope({ items }, traceId);
  },

  async getAuditEvents(
    requestId: string,
    _idempotencyKey: string,
    traceId: string,
  ): Promise<ResponseEnvelope<{ items: Array<{ event_id: number; request_id: string; created_at: string }> }>> {
    return requestJson<{ items: Array<{ event_id: number; request_id: string; created_at: string }> }>(
      `/api/v1/audit/events?request_id=${encodeURIComponent(requestId)}`,
      { method: "GET" },
      traceId,
      true,
    );
  },

  async fundEscrow(
    input: { escrow_id: string; partner_outcome: string; note?: string },
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<{
    request_id: string;
    idempotency_key: string;
    replayed: boolean;
    escrow_transition: { notification_count: number };
    escrow: { escrow_id: string };
  }>> {
    return this._sendEscrowCommand("settlement.escrow.fund", input, traceId, actorId, countryCode);
  },

  async releaseEscrow(
    input: { escrow_id: string; note?: string },
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<{
    request_id: string;
    idempotency_key: string;
    replayed: boolean;
    escrow_transition: { notification_count: number };
    escrow: { escrow_id: string };
  }>> {
    return this._sendEscrowCommand("settlement.escrow.release", input, traceId, actorId, countryCode);
  },

  async reverseEscrow(
    input: { escrow_id: string; reversal_reason: string; note?: string },
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<{
    request_id: string;
    idempotency_key: string;
    replayed: boolean;
    escrow_transition: { notification_count: number };
    escrow: { escrow_id: string };
  }>> {
    return this._sendEscrowCommand("settlement.escrow.reverse", input, traceId, actorId, countryCode);
  },

  async disputeEscrow(
    input: { escrow_id: string; note: string },
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<{
    request_id: string;
    idempotency_key: string;
    replayed: boolean;
    escrow_transition: { notification_count: number };
    escrow: { escrow_id: string };
  }>> {
    return this._sendEscrowCommand("settlement.escrow.dispute_open", input, traceId, actorId, countryCode);
  },

  async _sendEscrowCommand(
    commandName: string,
    input: Record<string, unknown>,
    traceId: string,
    actorId: string,
    countryCode: string,
  ): Promise<ResponseEnvelope<{
    request_id: string;
    idempotency_key: string;
    replayed: boolean;
    escrow_transition: { notification_count: number };
    escrow: { escrow_id: string };
  }>> {
    const requestId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const response = await requestJson<{
      status: string;
      request_id: string;
      idempotency_key: string;
      result: {
        escrow: { escrow_id: string };
        escrow_transition: { notification_count: number };
      };
      audit_event_id: number;
      replayed: boolean;
    }>(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: actorId,
            country_code: countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: ["CJ-004"],
              data_check_ids: ["DI-003"],
            },
          },
          command: {
            name: commandName,
            aggregate_ref: String(input.escrow_id),
            mutation_scope: "settlement.escrow",
            payload: input,
          },
        }),
      },
      traceId,
      true,
    );
    return responseEnvelope(
      {
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
        escrow_transition: response.data.result.escrow_transition,
        escrow: response.data.result.escrow,
      },
      traceId,
    );
  },

  async sendNegotiationCommand(
    params: {
      actorId: string;
      aggregateRef: string;
      commandName:
        | "market.negotiations.create"
        | "market.negotiations.counter"
        | "market.negotiations.confirm.request"
        | "market.negotiations.confirm.approve"
        | "market.negotiations.confirm.reject";
      countryCode: string;
      idempotencyKey?: string;
      input:
        | NegotiationCreateInput
        | NegotiationCounterInput
        | NegotiationConfirmationRequestInput
        | NegotiationConfirmationApproveInput
        | NegotiationConfirmationRejectInput;
      traceId: string;
    },
    traceId: string,
  ): Promise<ResponseEnvelope<{ thread: NegotiationThreadRead; request_id: string; idempotency_key: string; replayed: boolean }>> {
    const requestId = crypto.randomUUID();
    const idempotencyKey = params.idempotencyKey ?? crypto.randomUUID();
    const response = await requestJson<{
      status: string;
      request_id: string;
      idempotency_key: string;
      result: { schema_version: string; thread: NegotiationThreadRead };
      audit_event_id: number;
      replayed: boolean;
    }>(
      "/api/v1/workflow/commands",
      {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            request_id: requestId,
            idempotency_key: idempotencyKey,
            actor_id: params.actorId,
            country_code: params.countryCode,
            channel: "pwa",
            schema_version: schemaVersion as typeof schemaVersion,
            correlation_id: params.traceId,
            occurred_at: nowIso(),
            traceability: {
              journey_ids: ["CJ-003", "RJ-002"],
              data_check_ids: ["DI-002"],
            },
          },
          command: {
            name: params.commandName,
            aggregate_ref: params.aggregateRef,
            mutation_scope: "marketplace.negotiations",
            payload: params.input,
          },
        }),
      },
      traceId,
      true,
    );
    return responseEnvelope(
      {
        thread: response.data.result.thread,
        request_id: response.data.request_id,
        idempotency_key: response.data.idempotency_key,
        replayed: response.data.replayed,
      },
      traceId,
    );
  },

};

export const mockApiClient = agroApiClient;
