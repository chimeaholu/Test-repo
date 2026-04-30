/**
 * RB-002 — Advisory domain service.
 *
 * AI advisory conversation retrieval with locale-aware fallback
 * fixtures for offline/demo resilience.
 */

import type {
  ResponseEnvelope,
} from "@agrodomain/contracts";
import {
  advisoryConversationCollectionSchema,
  schemaVersion,
} from "@agrodomain/contracts";
import type { z } from "zod";

import {
  readSession,
  requestJson,
  responseEnvelope,
} from "../api-client";
import type { AdvisoryRuntimeMode } from "../api-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdvisoryConversationCollection = z.infer<
  typeof advisoryConversationCollectionSchema
>;

// ---------------------------------------------------------------------------
// Locale resolution
// ---------------------------------------------------------------------------

const advisoryLocales = ["en-GH", "fr-CI", "sw-KE"] as const;

function resolveSupportedLocale(
  locale: string | null | undefined,
): string {
  if (!locale) return "en-GH";
  if (
    advisoryLocales.includes(
      locale as (typeof advisoryLocales)[number],
    )
  )
    return locale;
  const language = locale.split("-")[0];
  const match = advisoryLocales.find((c) =>
    c.startsWith(`${language}-`),
  );
  return match ?? "en-GH";
}

// ---------------------------------------------------------------------------
// Fallback fixture builder (locale-aware)
// ---------------------------------------------------------------------------

function buildAdvisoryFixtures(
  locale: string,
  actorId: string,
): AdvisoryConversationCollection {
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
          question_text:
            "Les feuilles de manioc jaunissent apres les fortes pluies. Que faut-il verifier en premier ?",
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
              citation_url:
                "https://example.com/fr-ci-cassava-drainage",
              published_at: "2026-04-10T09:00:00.000Z",
              excerpt:
                "Verifier le drainage et comparer les plants en zone seche avec les plants restes dans l'eau stagnante.",
              method_tag: "extension-drainage-check",
            },
          ],
          transcript_entries: [
            {
              speaker: "user",
              message:
                "Les feuilles jaunissent apres la pluie.",
              captured_at: "2026-04-18T20:10:00.000Z",
              channel: "pwa",
            },
            {
              speaker: "assistant",
              message:
                "J'examine des sources agronomiques ivoiriennes avant de proposer des etapes.",
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
            transcript_link:
              "advisory://conversation-fr-001/review-fr-001",
            policy_context: {
              matched_policy: "crop_health.general",
              confidence_threshold: 0.75,
              policy_sensitive: false,
            },
            created_at: "2026-04-18T20:12:00.000Z",
          },
          source_ids: ["src-ci-extension-01"],
          model_name: "agro-advisor",
          model_version: "n4-grounded-2026.04",
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
          question_text:
            "Baada ya mvua nyingi, mahindi yanaanza kuwa ya njano. Ni hatua gani salama za kwanza?",
          response_text:
            "Anza kwa kuangalia kama maji yamesimama, mizizi inanuka, au mimea dhaifu iko kwenye sehemu ya chini ya shamba. Ondoa maji yanayosimama na usiongeze mbolea mpaka hali ya udongo ijulikane.",
          status: "hitl_required",
          confidence_band: "medium",
          confidence_score: 0.61,
          grounded: true,
          citations: [
            {
              source_id: "src-ke-weather-01",
              title:
                "Mvua kubwa na hatari ya mizizi kuoza",
              source_type: "weather",
              locale: "sw-KE",
              country_code: "KE",
              citation_url:
                "https://example.com/sw-ke-rain-risk",
              published_at: "2026-04-12T08:00:00.000Z",
              excerpt:
                "Hatua za awali zinapaswa kuanza na ukaguzi wa maji yaliyotuama kabla ya kuongeza pembejeo.",
              method_tag: "weather-root-rot-watch",
            },
          ],
          transcript_entries: [
            {
              speaker: "user",
              message:
                "Mahindi yanageuka njano baada ya mvua nyingi.",
              captured_at: "2026-04-18T20:10:00.000Z",
              channel: "pwa",
            },
            {
              speaker: "reviewer",
              message:
                "Mkaguzi wa kibinadamu anahitajika kabla ya kuidhinisha hatua za dawa.",
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
            transcript_link:
              "advisory://conversation-sw-001/review-sw-001",
            policy_context: {
              matched_policy:
                "crop_health.treatment_guardrail",
              confidence_threshold: 0.75,
              policy_sensitive: true,
            },
            created_at: "2026-04-18T20:12:00.000Z",
          },
          source_ids: ["src-ke-weather-01"],
          model_name: "agro-advisor",
          model_version: "n4-grounded-2026.04",
          correlation_id: "trace-advisory-sw-001",
          request_id: "req-advisory-sw-001",
          delivered_at: null,
          created_at: "2026-04-18T20:12:00.000Z",
        },
      ],
    });
  }

  // Default: en-GH
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
        question_text:
          "Leaves are turning yellow after heavy rain. What should the farmer verify first before treating the field?",
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
            citation_url:
              "https://example.com/ghana-maize-drainage",
            published_at: "2026-04-11T08:00:00.000Z",
            excerpt:
              "Drainage and root inspection should happen before any nutrient correction after heavy rain.",
            method_tag: "field-drainage-triage",
          },
          {
            source_id: "src-gh-manual-02",
            title: "Waterlogging response checklist",
            source_type: "manual",
            locale: "en-GH",
            country_code: "GH",
            citation_url:
              "https://example.com/waterlogging-checklist",
            published_at: "2026-04-09T08:00:00.000Z",
            excerpt:
              "Compare affected rows with unaffected rows to separate nutrient stress from waterlogging injury.",
            method_tag: "comparison-row-check",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message:
              "Leaves are turning yellow after last week's heavy rain.",
            captured_at: "2026-04-18T20:05:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "assistant",
            message:
              "I am grounding the answer against extension guidance and weather-linked risk notes.",
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
          transcript_link:
            "advisory://conversation-en-001/review-en-001",
          policy_context: {
            matched_policy: "crop_health.general",
            confidence_threshold: 0.75,
            policy_sensitive: false,
          },
          created_at: "2026-04-18T20:10:00.000Z",
        },
        source_ids: [
          "src-gh-extension-01",
          "src-gh-manual-02",
        ],
        model_name: "agro-advisor",
        model_version: "n4-grounded-2026.04",
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
        question_text:
          "Can I tell the farmer to apply a fungicide immediately after this rainfall pattern?",
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
            citation_url:
              "https://example.com/ghana-treatment-policy",
            published_at: "2026-04-08T08:00:00.000Z",
            excerpt:
              "Chemical treatment recommendations require a reviewer when disease confirmation is incomplete.",
            method_tag: "policy-treatment-escalation",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message:
              "Can I recommend fungicide immediately?",
            captured_at: "2026-04-18T20:12:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "reviewer",
            message:
              "Do not deliver until a human reviewer confirms the disease pattern.",
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
          transcript_link:
            "advisory://conversation-en-002/review-en-002",
          policy_context: {
            matched_policy:
              "crop_health.treatment_guardrail",
            confidence_threshold: 0.75,
            policy_sensitive: true,
          },
          created_at: "2026-04-18T20:13:00.000Z",
        },
        source_ids: ["src-gh-policy-03"],
        model_name: "agro-advisor",
        model_version: "n4-grounded-2026.04",
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
        question_text:
          "A trader says a new additive will reverse yellowing in one day. Can that advice be sent?",
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
            citation_url:
              "https://example.com/unverified-input-claims",
            published_at: "2026-04-07T08:00:00.000Z",
            excerpt:
              "Advice tied to unverified commercial claims must be blocked when evidence is insufficient.",
            method_tag:
              "policy-unverified-input-block",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message:
              "A trader says a new additive will fix this in one day.",
            captured_at: "2026-04-18T20:15:00.000Z",
            channel: "pwa",
          },
          {
            speaker: "system",
            message:
              "Delivery blocked because the evidence threshold was not met.",
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
          transcript_link:
            "advisory://conversation-en-003/review-en-003",
          policy_context: {
            matched_policy:
              "crop_health.claim_validation",
            confidence_threshold: 0.75,
            policy_sensitive: true,
          },
          created_at: "2026-04-18T20:16:00.000Z",
        },
        source_ids: ["src-gh-policy-04"],
        model_name: "agro-advisor",
        model_version: "n4-grounded-2026.04",
        correlation_id: "trace-advisory-en-003",
        request_id: "req-advisory-en-003",
        delivered_at: null,
        created_at: "2026-04-18T20:16:00.000Z",
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Advisory API
// ---------------------------------------------------------------------------

export const advisoryApi = {
  async listConversations(
    traceId: string,
    locale?: string | null,
  ): Promise<
    ResponseEnvelope<
      AdvisoryConversationCollection & {
        runtime_mode: AdvisoryRuntimeMode;
      }
    >
  > {
    const session = readSession();
    const resolvedLocale = resolveSupportedLocale(
      locale ?? session?.actor.locale,
    );

    try {
      const params = new URLSearchParams({
        locale: resolvedLocale,
      });
      const response = await requestJson<unknown>(
        `/api/v1/advisory/conversations?${params.toString()}`,
        { method: "GET" },
        traceId,
        true,
      );
      const parsed =
        advisoryConversationCollectionSchema.parse(response.data);
      if (parsed.items.length === 0) {
        throw new Error("n4_advisory_runtime_empty");
      }
      return responseEnvelope(
        { ...parsed, runtime_mode: "live" as const },
        traceId,
      );
    } catch {
      const fallback = buildAdvisoryFixtures(
        resolvedLocale,
        session?.actor.actor_id ??
          "actor-advisory-continuity",
      );
      return responseEnvelope(
        { ...fallback, runtime_mode: "fallback" as const },
        traceId,
      );
    }
  },
};
