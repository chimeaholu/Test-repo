import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  contractCatalog,
  eventEnvelopeContract,
  notificationAttemptContract,
  offlineQueueCommandContract,
  offlineQueueResultContract,
  policyDecisionContract,
  requestEnvelopeContract,
  responseEnvelopeContract,
  consentGateContract,
  consentRecordContract,
  countryPackContract,
  countryPackRuntimeContract,
  environmentProfileContract,
  featureFlagContract,
  translatorCommandContract,
  reasonCatalog,
  rolloutPolicyContract,
  schemaVersion,
  ussdSessionContract,
  whatsappCommandContract,
  createListingResultContract,
  listingCollectionContract,
  listingCreateInputContract,
  listingPublishInputContract,
  listingRecordContract,
  listingRevisionSummaryContract,
  listingUnpublishInputContract,
  listingUpdateInputContract,
  negotiationCounterInputContract,
  negotiationConfirmationApproveInputContract,
  negotiationConfirmationRejectInputContract,
  negotiationConfirmationRequestInputContract,
  negotiationCreateInputContract,
  negotiationThreadReadContract,
  publishListingResultContract,
  unpublishListingResultContract,
  advisoryRequestInputContract,
  advisoryResponseContract,
  reviewerDecisionContract,
  reviewerDecisionInputContract,
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
  consignmentCreateInputContract,
  consignmentContract,
  evidenceAttachmentContract,
  financeDecisionContract,
  financeDecisionInputContract,
  financePartnerRequestContract,
  financeReviewDetailContract,
  financeReviewQueueItemContract,
  insurancePayoutEventContract,
  insuranceTriggerEvaluationInputContract,
  insuranceTriggerRegistryContract,
  adminAnalyticsSnapshotContract,
  adminServiceLevelSummaryContract,
  releaseReadinessStatusContract,
  rolloutControlInputContract,
  rolloutStatusContract,
  sloEvaluationContract,
  telemetryObservationInputContract,
  telemetryObservationRecordContract,
  traceabilityEventAppendInputContract,
  traceabilityEventContract,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("C-001 canonical transport envelope", () => {
  it("accepts valid request, response, and event envelopes", () => {
    expect(() =>
      requestEnvelopeContract.schema.parse({
        metadata: {
          schema_version: schemaVersion,
          request_id: "req-1",
          idempotency_key: "idem-1",
          actor_id: "actor-1",
          country_code: "GH",
          channel: "whatsapp",
          correlation_id: "corr-1",
          causation_id: "cause-1",
          occurred_at: "2026-04-18T00:00:00Z",
          traceability: { journey_ids: ["AIJ-002"], data_check_ids: ["IDI-003"] },
        },
        command: {
          name: "marketplace.create_listing",
          aggregate_ref: "listing/listing-1",
          mutation_scope: "marketplace.listings",
          payload: { commodity: "maize" },
        },
      }),
    ).not.toThrow();

    expect(() =>
      responseEnvelopeContract.schema.parse({
        metadata: {
          schema_version: schemaVersion,
          request_id: "req-1",
          correlation_id: "corr-1",
          causation_id: "cause-1",
          emitted_at: "2026-04-18T00:00:01Z",
        },
        status: "completed",
        data: { listing_id: "listing-1" },
      }),
    ).not.toThrow();

    expect(() =>
      eventEnvelopeContract.schema.parse({
        metadata: {
          schema_version: schemaVersion,
          event_id: "evt-1",
          event_type: "listing.created",
          request_id: "req-1",
          correlation_id: "corr-1",
          causation_id: "cause-1",
          actor_id: "actor-1",
          country_code: "GH",
          channel: "whatsapp",
          occurred_at: "2026-04-18T00:00:01Z",
          traceability: { journey_ids: ["AIJ-002"], data_check_ids: ["IDI-003"] },
        },
        payload: { listing_id: "listing-1" },
      }),
    ).not.toThrow();
  });

  it("rejects unknown fields and missing idempotency/schema version", () => {
    const unknownField = requestEnvelopeContract.schema.safeParse({
      metadata: {
        schema_version: schemaVersion,
        request_id: "req-1",
        actor_id: "actor-1",
        country_code: "GH",
        channel: "whatsapp",
        correlation_id: "corr-1",
        occurred_at: "2026-04-18T00:00:00Z",
        traceability: { journey_ids: ["AIJ-002"], data_check_ids: ["IDI-003"] },
        unexpected: true,
      },
      command: {
        name: "marketplace.create_listing",
        aggregate_ref: "listing/listing-1",
        mutation_scope: "marketplace.listings",
        payload: {},
      },
    });

    expect(unknownField.success).toBe(false);

    const missingIdempotency = requestEnvelopeContract.schema.safeParse({
      metadata: {
        schema_version: schemaVersion,
        request_id: "req-1",
        actor_id: "actor-1",
        country_code: "GH",
        channel: "whatsapp",
        correlation_id: "corr-1",
        occurred_at: "2026-04-18T00:00:00Z",
        traceability: { journey_ids: ["AIJ-002"], data_check_ids: ["IDI-003"] },
      },
      command: {
        name: "marketplace.create_listing",
        aggregate_ref: "listing/listing-1",
        mutation_scope: "marketplace.listings",
        payload: {},
      },
    });

    expect(missingIdempotency.success).toBe(false);
    expect(reasonCatalog.reason_codes.some((code) => code.code === "invalid_schema")).toBe(true);
  });
});

describe("C-002 identity, workflow, and policy contracts", () => {
  it("enforces consent lifecycle requirements", () => {
    expect(
      consentRecordContract.schema.safeParse({
        schema_version: schemaVersion,
        actor_id: "actor-1",
        country_code: "GH",
        state: "consent_granted",
        consent_scope_ids: [],
      }).success,
    ).toBe(false);

    expect(
      consentRecordContract.schema.safeParse({
        schema_version: schemaVersion,
        actor_id: "actor-1",
        country_code: "GH",
        state: "consent_granted",
        policy_version: "2026-04",
        consent_scope_ids: ["profile.read"],
        consent_channel: "whatsapp",
        consent_captured_at: "2026-04-18T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid country pack locale/legal settings and regulated allow decisions without consent", () => {
    expect(
      countryPackContract.schema.safeParse({
        schema_version: schemaVersion,
        country_code: "GH",
        region: "west_africa",
        currency: "GHS",
        default_locale: "fr-GH",
        supported_locales: ["en-GH"],
        supported_channels: ["ussd", "whatsapp"],
        legal_notices: [
          {
            notice_id: "privacy-gh",
            locale: "en-GH",
            title: "Privacy",
            body_markdown: "Required",
            required_for_scopes: ["profile.read"],
          },
        ],
        regulated_mutation_requires_consent: true,
      }).success,
    ).toBe(false);

    expect(
      consentGateContract.schema.safeParse({
        schema_version: schemaVersion,
        regulated_mutation: true,
        consent_required: true,
        consent_state: "consent_pending",
        decision: "allow",
        reason_code: "missing_consent",
      }).success,
    ).toBe(false);
  });

  it("encodes policy decisions with reason codes", () => {
    const decision = policyDecisionContract.schema.parse({
      schema_version: schemaVersion,
      tool_name: "wallet.release_escrow",
      actor_role: "finance_ops",
      country_code: "GH",
      risk_score: 90,
      hitl_approved: false,
      request_id: "req-1",
      decision: "challenge",
      reason_code: "policy_hitl_required",
      hitl_required: true,
      matched_rule: "wallet.release_escrow",
    });

    expect(decision.reason_code).toBe("policy_hitl_required");
  });
});

describe("C-003 channels and notifications contracts", () => {
  it("validates translator-only channel DTOs and offline replay conflict metadata", () => {
    expect(
      ussdSessionContract.schema.parse({
        schema_version: schemaVersion,
        session_id: "sess-1",
        workflow_id: "wf-1",
        phone_number: "+233555000000",
        country_code: "GH",
        current_menu_id: "root",
        revision: 0,
        status: "active",
        started_at_epoch_ms: 1,
        last_seen_epoch_ms: 1,
        expires_at_epoch_ms: 2,
        locale: "en-GH",
      }).current_menu_id,
    ).toBe("root");

    expect(
      whatsappCommandContract.schema.parse({
        schema_version: schemaVersion,
        message_id: "wamid-1",
        contact_id: "contact-1",
        message_type: "text",
        locale: "en-GH",
        intent: "create_listing",
        command_name: "sell",
        arguments: { commodity: "maize" },
        confidence_score: 0.92,
        fallback_channel: "sms",
      }).intent,
    ).toBe("create_listing");

    expect(
      offlineQueueCommandContract.schema.parse({
        schema_version: schemaVersion,
        item_id: "item-1",
        workflow_id: "wf-1",
        intent: "create_listing",
        payload: { commodity: "maize" },
        idempotency_key: "idem-1",
        channel: "pwa",
        created_at: "2026-04-18T00:00:00Z",
        attempt_count: 1,
        state: "failed_retryable",
        available_at_epoch_ms: 100,
        correlation_id: "corr-1",
        conflict: {
          state: "stale_version",
          reason_code: "offline_conflict",
          conflict_ref: "listing/listing-1@2",
        },
      }).conflict.state,
    ).toBe("stale_version");

    expect(
      translatorCommandContract.schema.parse({
        schema_version: schemaVersion,
        channel: "whatsapp",
        transport_command: "reply_button",
        aggregate_ref: "listing/listing-1",
        mutation_semantics_exposed: false,
      }).mutation_semantics_exposed,
    ).toBe(false);
  });

  it("captures delivery fallback state and replay result requirements", () => {
    expect(
      offlineQueueResultContract.schema.safeParse({
        schema_version: schemaVersion,
        item_id: "item-1",
        disposition: "retry",
        conflict: { state: "none" },
      }).success,
    ).toBe(true);

    expect(
      notificationAttemptContract.schema.safeParse({
        schema_version: schemaVersion,
        notification_id: "notif-1",
        intent_type: "settlement_update",
        recipient: { contact_id: "contact-1", locale: "en-GH", phone_number: "+233555000000" },
        attempted_channels: ["whatsapp", "sms"],
        final_channel: "sms",
        final_state: "fallback_sent",
        fallback_triggered: true,
        parity_key: "settlement_update",
        attempted_at: "2026-04-18T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("N4-C1 advisory and reviewer contracts", () => {
  it("accepts grounded advisory responses with citations and reviewer decisions", () => {
    expect(
      advisoryResponseContract.schema.parse({
        schema_version: schemaVersion,
        advisory_request_id: "adv-req-1",
        advisory_conversation_id: "adv-conv-1",
        actor_id: "actor-farmer-gh-ama",
        country_code: "GH",
        locale: "en-GH",
        topic: "maize pest prevention",
        question_text: "How should I reduce fall armyworm risk on my maize field this week?",
        response_text:
          "Scout the field twice this week, prioritize early-stage plots, and isolate any hotspots before applying the approved extension guidance.",
        status: "delivered",
        confidence_band: "high",
        confidence_score: 0.91,
        grounded: true,
        citations: [
          {
            source_id: "src-armyworm-gh-1",
            title: "Ghana maize fall armyworm extension bulletin",
            source_type: "extension",
            locale: "en-GH",
            country_code: "GH",
            citation_url: "https://example.com/ghana-armyworm",
            published_at: "2026-04-18T00:00:00Z",
            excerpt: "Scout maize twice weekly and isolate hotspot treatment to early-stage infestations.",
            method_tag: "extension_bulletin",
          },
        ],
        transcript_entries: [
          {
            speaker: "user",
            message: "How should I reduce fall armyworm risk on my maize field this week?",
            captured_at: "2026-04-18T00:00:00Z",
            channel: "pwa",
          },
        ],
        reviewer_decision: {
          schema_version: schemaVersion,
          advisory_request_id: "adv-req-1",
          decision_id: "rev-1",
          actor_id: "system:reviewer",
          actor_role: "admin",
          outcome: "approve",
          reason_code: "grounded_response_ready",
          note: "Citations and confidence are sufficient for delivery.",
          transcript_link: "audit://adv-req-1/reviewer",
          policy_context: {
            matched_policy: "advisory.default_delivery",
            confidence_threshold: 0.75,
            policy_sensitive: false,
          },
          created_at: "2026-04-18T00:00:02Z",
        },
        source_ids: ["src-armyworm-gh-1"],
        model_name: "agrodomain-retrieval-runtime",
        model_version: "n4-a1",
        correlation_id: "corr-adv-1",
        request_id: "req-adv-1",
        delivered_at: "2026-04-18T00:00:03Z",
        created_at: "2026-04-18T00:00:01Z",
      }).status,
    ).toBe("delivered");
  });

  it("rejects grounded responses without citations and invalid delivered HITL state", () => {
    expect(
      advisoryResponseContract.schema.safeParse({
        schema_version: schemaVersion,
        advisory_request_id: "adv-req-2",
        advisory_conversation_id: "adv-conv-1",
        actor_id: "actor-farmer-gh-ama",
        country_code: "GH",
        locale: "en-GH",
        topic: "maize pest prevention",
        question_text: "How should I reduce fall armyworm risk on my maize field this week?",
        response_text: "Advice without sources should fail.",
        status: "delivered",
        confidence_band: "low",
        confidence_score: 0.2,
        grounded: true,
        citations: [],
        transcript_entries: [
          {
            speaker: "user",
            message: "How should I reduce fall armyworm risk on my maize field this week?",
            captured_at: "2026-04-18T00:00:00Z",
            channel: "pwa",
          },
        ],
        reviewer_decision: {
          schema_version: schemaVersion,
          advisory_request_id: "adv-req-2",
          decision_id: "rev-2",
          actor_id: "system:reviewer",
          actor_role: "admin",
          outcome: "hitl_required",
          reason_code: "low_confidence_sources",
          policy_context: {
            matched_policy: "advisory.default_delivery",
            confidence_threshold: 0.75,
            policy_sensitive: false,
          },
          created_at: "2026-04-18T00:00:02Z",
        },
        source_ids: [],
        model_name: "agrodomain-retrieval-runtime",
        model_version: "n4-a1",
        correlation_id: "corr-adv-2",
        request_id: "req-adv-2",
        delivered_at: "2026-04-18T00:00:03Z",
        created_at: "2026-04-18T00:00:01Z",
      }).success,
    ).toBe(false);
  });

  it("accepts manual reviewer input payloads", () => {
    expect(
      reviewerDecisionInputContract.schema.parse({
        advisory_request_id: "adv-req-1",
        outcome: "revise",
        reason_code: "revision_needed_for_clarity",
        note: "Add clearer citation callouts before delivery.",
        transcript_link: "audit://adv-req-1/reviewer",
      }).outcome,
    ).toBe("revise");

    expect(
      advisoryRequestInputContract.schema.parse({
        topic: "soil moisture",
        question_text: "What should I do about low soil moisture before next week?",
        locale: "en-GH",
        transcript_entries: [],
        policy_context: {
          crop: "maize",
          farm_profile_id: "farm-1",
          region: "Northern Region",
          sensitive_topics: [],
        },
      }).topic,
    ).toBe("soil moisture");

    expect(
      reviewerDecisionContract.schema.safeParse({
        schema_version: schemaVersion,
        advisory_request_id: "adv-req-1",
        decision_id: "rev-approve-sensitive",
        actor_id: "system:reviewer",
          actor_role: "admin",
        outcome: "approve",
        reason_code: "grounded_response_ready",
        policy_context: {
          matched_policy: "advisory.default_delivery",
          confidence_threshold: 0.75,
          policy_sensitive: true,
        },
        created_at: "2026-04-18T00:00:02Z",
      }).success,
    ).toBe(false);
  });
});

describe("N4-C1 climate and MRV contracts", () => {
  it("accepts alert, acknowledgement, degraded-mode, and MRV evidence payloads", () => {
    expect(
      climateAlertContract.schema.parse({
        schema_version: schemaVersion,
        alert_id: "alert-1",
        farm_profile_id: "farm-1",
        country_code: "GH",
        locale: "en-GH",
        severity: "warning",
        title: "Heavy rainfall expected",
        summary: "Heavy rainfall is expected over the next 48 hours for your farm location.",
        source_ids: ["climate-src-1"],
        degraded_mode: false,
        acknowledged: false,
        created_at: "2026-04-18T00:00:00Z",
      }).severity,
    ).toBe("warning");

    expect(
      climateAlertAcknowledgementContract.schema.parse({
        schema_version: schemaVersion,
        alert_id: "alert-1",
        actor_id: "actor-farmer-gh-ama",
        acknowledged_at: "2026-04-18T00:05:00Z",
        note: "Reviewed and shared with field team.",
      }).alert_id,
    ).toBe("alert-1");

    expect(
      climateDegradedModeContract.schema.parse({
        schema_version: schemaVersion,
        source_window_id: "window-1",
        country_code: "GH",
        farm_profile_id: "farm-1",
        degraded_mode: true,
        reason_code: "source_window_missing",
        assumptions: ["Fallback to last complete rainfall bulletin within 72 hours."],
        source_ids: [],
        detected_at: "2026-04-18T00:06:00Z",
      }).degraded_mode,
    ).toBe(true);

    expect(
      mrvEvidenceRecordContract.schema.parse({
        schema_version: schemaVersion,
        evidence_id: "mrv-1",
        farm_profile_id: "farm-1",
        country_code: "GH",
        method_tag: "ipcc-tier-1",
        assumption_notes: ["Assumes field area from verified cooperative registration."],
        source_references: [
          {
            source_id: "mrv-src-1",
            title: "Soil carbon baseline worksheet",
            method_reference: "IPCC 2019 refinement",
          },
        ],
        source_completeness: "complete",
        created_at: "2026-04-18T00:10:00Z",
      }).method_tag,
    ).toBe("ipcc-tier-1");
  });
});

describe("V-001 marketplace listing contracts", () => {
  it("validates create payloads and persisted listing records", () => {
    expect(
      listingCreateInputContract.schema.safeParse({
        title: "Premium cassava harvest",
        commodity: "Cassava",
        quantity_tons: 4.2,
        price_amount: 320,
        price_currency: "GHS",
        location: "Tamale, GH",
        summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
      }).success,
    ).toBe(true);

    expect(
      listingRecordContract.schema.safeParse({
        schema_version: schemaVersion,
        listing_id: "listing-1",
        actor_id: "actor-1",
        country_code: "GH",
        title: "Premium cassava harvest",
        commodity: "Cassava",
        quantity_tons: 4.2,
        price_amount: 320,
        price_currency: "GHS",
        location: "Tamale, GH",
        summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
        status: "published",
        revision_number: 2,
        published_revision_number: 2,
        revision_count: 2,
        has_unpublished_changes: false,
        view_scope: "owner",
        published_at: "2026-04-18T00:00:00Z",
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid listing payloads and enforces collection/result shape", () => {
    expect(
      listingCreateInputContract.schema.safeParse({
        title: "No",
        commodity: "C",
        quantity_tons: 0,
        price_amount: -10,
        price_currency: "ghs",
        location: "X",
        summary: "short",
      }).success,
    ).toBe(false);

    expect(
      listingUpdateInputContract.schema.safeParse({
        listing_id: "listing-1",
        title: "Premium cassava harvest",
        commodity: "Cassava",
        quantity_tons: 4.2,
        price_amount: 320,
        price_currency: "GHS",
        location: "Tamale, GH",
        summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
        status: "published",
      }).success,
    ).toBe(true);

    expect(() =>
      listingCollectionContract.schema.parse({
        schema_version: schemaVersion,
        items: [
          {
            schema_version: schemaVersion,
            listing_id: "listing-1",
            actor_id: "actor-1",
            country_code: "GH",
            title: "Premium cassava harvest",
            commodity: "Cassava",
            quantity_tons: 4.2,
            price_amount: 320,
            price_currency: "GHS",
            location: "Tamale, GH",
            summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
            status: "published",
            revision_number: 2,
            published_revision_number: 2,
            revision_count: 2,
            has_unpublished_changes: false,
            view_scope: "owner",
            published_at: "2026-04-18T00:00:00Z",
            created_at: "2026-04-18T00:00:00Z",
            updated_at: "2026-04-18T00:00:00Z",
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      createListingResultContract.schema.parse({
        schema_version: schemaVersion,
        listing: {
          schema_version: schemaVersion,
          listing_id: "listing-1",
          actor_id: "actor-1",
          country_code: "GH",
          title: "Premium cassava harvest",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          status: "published",
          revision_number: 1,
          published_revision_number: null,
          revision_count: 1,
          has_unpublished_changes: true,
          view_scope: "owner",
          published_at: null,
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        audit_event_id: 1,
        replayed: false,
      }),
    ).not.toThrow();
  });
});

describe("N2 marketplace publish contracts", () => {
  it("validates publish and revision summary DTOs", () => {
    expect(
      listingPublishInputContract.schema.safeParse({
        listing_id: "listing-1",
      }).success,
    ).toBe(true);

    expect(
      listingUnpublishInputContract.schema.safeParse({
        listing_id: "listing-1",
      }).success,
    ).toBe(true);

    expect(
      listingRevisionSummaryContract.schema.safeParse({
        schema_version: schemaVersion,
        listing_id: "listing-1",
        revision_number: 3,
        change_type: "published",
        actor_id: "actor-1",
        country_code: "GH",
        status: "published",
        title: "Premium cassava harvest",
        commodity: "Cassava",
        quantity_tons: 4.2,
        price_amount: 320,
        price_currency: "GHS",
        location: "Tamale, GH",
        summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
        changed_at: "2026-04-18T00:00:00Z",
      }).success,
    ).toBe(true);

    expect(() =>
      publishListingResultContract.schema.parse({
        schema_version: schemaVersion,
        listing: {
          schema_version: schemaVersion,
          listing_id: "listing-1",
          actor_id: "actor-1",
          country_code: "GH",
          title: "Premium cassava harvest",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          status: "published",
          revision_number: 3,
          published_revision_number: 3,
          revision_count: 3,
          has_unpublished_changes: false,
          view_scope: "owner",
          published_at: "2026-04-18T00:00:00Z",
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        revision_summary: {
          schema_version: schemaVersion,
          listing_id: "listing-1",
          revision_number: 3,
          change_type: "published",
          actor_id: "actor-1",
          country_code: "GH",
          status: "published",
          title: "Premium cassava harvest",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          changed_at: "2026-04-18T00:00:00Z",
        },
      }),
    ).not.toThrow();

    expect(() =>
      unpublishListingResultContract.schema.parse({
        schema_version: schemaVersion,
        listing: {
          schema_version: schemaVersion,
          listing_id: "listing-1",
          actor_id: "actor-1",
          country_code: "GH",
          title: "Premium cassava harvest",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          status: "draft",
          revision_number: 4,
          published_revision_number: null,
          revision_count: 4,
          has_unpublished_changes: true,
          view_scope: "owner",
          published_at: null,
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        revision_summary: {
          schema_version: schemaVersion,
          listing_id: "listing-1",
          revision_number: 4,
          change_type: "unpublished",
          actor_id: "actor-1",
          country_code: "GH",
          status: "draft",
          title: "Premium cassava harvest",
          commodity: "Cassava",
          quantity_tons: 4.2,
          price_amount: 320,
          price_currency: "GHS",
          location: "Tamale, GH",
          summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
          changed_at: "2026-04-18T00:00:00Z",
        },
      }),
    ).not.toThrow();
  });
});

describe("N2 negotiation contracts", () => {
  it("validates create, counter, confirmation, and thread read DTOs", () => {
    expect(
      negotiationCreateInputContract.schema.safeParse({
        listing_id: "listing-1",
        offer_amount: 450,
        offer_currency: "GHS",
        note: "Initial buyer offer",
      }).success,
    ).toBe(true);

    expect(
      negotiationCounterInputContract.schema.safeParse({
        thread_id: "thread-1",
        offer_amount: 500,
        offer_currency: "GHS",
        note: "Seller counter offer",
      }).success,
    ).toBe(true);

    expect(
      negotiationConfirmationRequestInputContract.schema.safeParse({
        thread_id: "thread-1",
        required_confirmer_actor_id: "actor-buyer",
        note: "Need final buyer confirmation",
      }).success,
    ).toBe(true);

    expect(
      negotiationConfirmationApproveInputContract.schema.safeParse({
        thread_id: "thread-1",
        note: "Buyer confirms final offer",
      }).success,
    ).toBe(true);

    expect(
      negotiationConfirmationRejectInputContract.schema.safeParse({
        thread_id: "thread-1",
        note: "Buyer rejects final offer",
      }).success,
    ).toBe(true);

    expect(
      negotiationThreadReadContract.schema.safeParse({
        schema_version: schemaVersion,
        thread_id: "thread-1",
        listing_id: "listing-1",
        seller_actor_id: "actor-seller",
        buyer_actor_id: "actor-buyer",
        country_code: "GH",
        status: "pending_confirmation",
        current_offer_amount: 500,
        current_offer_currency: "GHS",
        last_action_at: "2026-04-18T00:10:00Z",
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:10:00Z",
        confirmation_checkpoint: {
          requested_by_actor_id: "actor-seller",
          required_confirmer_actor_id: "actor-buyer",
          requested_at: "2026-04-18T00:10:00Z",
          note: "Need final buyer confirmation",
        },
        messages: [
          {
            schema_version: schemaVersion,
            actor_id: "actor-buyer",
            action: "offer_created",
            amount: 450,
            currency: "GHS",
            note: "Initial buyer offer",
            created_at: "2026-04-18T00:00:00Z",
          },
          {
            schema_version: schemaVersion,
            actor_id: "actor-seller",
            action: "confirmation_requested",
            amount: null,
            currency: null,
            note: "Need final buyer confirmation",
            created_at: "2026-04-18T00:10:00Z",
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("contract catalog discipline", () => {
  it("keeps traceability metadata on every contract", () => {
    for (const contract of contractCatalog) {
      expect(contract.traceability.length).toBeGreaterThan(0);
      expect(contract.sourceArtifacts.length).toBeGreaterThan(0);
      expect(contract.schemaVersion).toBe(schemaVersion);
    }
  });
});

describe("C-005 finance, insurance, and traceability contracts", () => {
  it("validates finance accountability payloads", () => {
    const financeRequest = financePartnerRequestContract.schema.parse({
      schema_version: schemaVersion,
      finance_request_id: "finance-req-1",
      request_id: "req-fin-1",
      idempotency_key: "idem-fin-1",
      actor_id: "actor-farmer-gh-ama",
      actor_role: "farmer",
      country_code: "GH",
      channel: "pwa",
      correlation_id: "corr-fin-1",
      case_reference: "listing/listing-101",
      product_type: "invoice_advance",
      requested_amount: 1200,
      currency: "GHS",
      partner_id: "partner-agri-bank",
      partner_reference_id: "partner-case-9",
      status: "pending_partner",
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
      transcript_entries: [
        {
          speaker: "agent",
          message: "Requested finance bundle sent to partner.",
          channel: "pwa",
          captured_at: "2026-04-18T00:00:00Z",
        },
      ],
      created_at: "2026-04-18T00:00:00Z",
      updated_at: "2026-04-18T00:00:10Z",
    });

    expect(financeRequest.partner_id).toBe("partner-agri-bank");
    expect(
      financeDecisionInputContract.schema.parse({
        finance_request_id: financeRequest.finance_request_id,
        decision_source: "partner",
        outcome: "approved",
        actor_role: "finance_ops",
        reason_code: "partner_approved",
        note: "Partner approval received",
        partner_reference_id: "partner-case-9",
        transcript_link: "audit://finance/finance-req-1/partner",
      }).outcome,
    ).toBe("approved");

    expect(
      financeDecisionContract.schema.safeParse({
        schema_version: schemaVersion,
        decision_id: "decision-1",
        finance_request_id: financeRequest.finance_request_id,
        request_id: "req-fin-2",
        actor_id: "actor-finance-gh-1",
        actor_role: "finance_ops",
        decision_source: "operator",
        outcome: "approved",
        reason_code: "manual_override",
        note: "should fail",
        partner_reference_id: null,
        responsibility_boundary: financeRequest.responsibility_boundary,
        policy_context: financeRequest.policy_context,
        transcript_link: null,
        decided_at: "2026-04-18T00:02:00Z",
      }).success,
    ).toBe(false);

    expect(
      financeReviewDetailContract.schema.parse({
        schema_version: schemaVersion,
        queue_item_id: "queue-1",
        finance_request_id: financeRequest.finance_request_id,
        partner_id: financeRequest.partner_id,
        partner_reference_id: financeRequest.partner_reference_id,
        actor_id: financeRequest.actor_id,
        actor_role: financeRequest.actor_role,
        country_code: financeRequest.country_code,
        status: "pending_review",
        responsibility_boundary: financeRequest.responsibility_boundary,
        policy_context: financeRequest.policy_context,
        summary: "Awaiting manual review after partner response.",
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:05:00Z",
        request: financeRequest,
        decisions: [],
      }).request.finance_request_id,
    ).toBe("finance-req-1");
  });

  it("validates insurance provenance and traceability references", () => {
    const triggerRegistry = insuranceTriggerRegistryContract.schema.parse({
      schema_version: schemaVersion,
      trigger_id: "trigger-rain-1",
      actor_id: "actor-finance-gh-1",
      actor_role: "finance_ops",
      country_code: "GH",
      partner_id: "partner-insurer-1",
      partner_reference_id: "policy-7",
      product_code: "rainfall-cover",
      climate_signal: "rainfall_mm",
      comparator: "gte",
      threshold_value: 75,
      threshold_unit: "mm",
      evaluation_window_hours: 24,
      threshold_source_id: "climate-threshold-1",
      threshold_source_type: "policy_table",
      threshold_source_reference: { table: "gh_rainfall_v2", percentile: 95 },
      payout_amount: 450,
      payout_currency: "GHS",
      policy_context: {
        policy_id: "insurance.parametric.v1",
        policy_version: "2026-04",
        matched_rule: "insurance.rainfall.gte",
        requires_hitl: false,
      },
      created_at: "2026-04-18T00:00:00Z",
      updated_at: "2026-04-18T00:00:00Z",
    });

    expect(
      insuranceTriggerEvaluationInputContract.schema.parse({
        trigger_id: triggerRegistry.trigger_id,
        partner_id: triggerRegistry.partner_id,
        partner_reference_id: triggerRegistry.partner_reference_id,
        actor_role: "finance_ops",
        product_code: triggerRegistry.product_code,
        climate_signal: triggerRegistry.climate_signal,
        comparator: triggerRegistry.comparator,
        threshold_value: triggerRegistry.threshold_value,
        threshold_unit: triggerRegistry.threshold_unit,
        evaluation_window_hours: triggerRegistry.evaluation_window_hours,
        threshold_source_id: triggerRegistry.threshold_source_id,
        threshold_source_type: triggerRegistry.threshold_source_type,
        threshold_source_reference: triggerRegistry.threshold_source_reference,
        observed_value: 82,
        source_event_id: "climate-event-1",
        source_observation_id: "obs-1",
        observed_at: "2026-04-18T01:00:00Z",
        payout_amount: triggerRegistry.payout_amount,
        payout_currency: triggerRegistry.payout_currency,
        policy_context: triggerRegistry.policy_context,
      }).source_event_id,
    ).toBe("climate-event-1");

    expect(
      insurancePayoutEventContract.schema.parse({
        schema_version: schemaVersion,
        payout_event_id: "payout-1",
        trigger_id: triggerRegistry.trigger_id,
        evaluation_id: "eval-1",
        actor_id: "actor-finance-gh-1",
        actor_role: "finance_ops",
        country_code: "GH",
        partner_id: triggerRegistry.partner_id,
        partner_reference_id: triggerRegistry.partner_reference_id,
        payout_dedupe_key: "trigger-rain-1:climate-event-1",
        payout_amount: 450,
        payout_currency: "GHS",
        climate_source_reference: {
          source_id: "obs-1",
          source_type: "climate_observation",
          observation_id: "obs-1",
          observed_at: "2026-04-18T01:00:00Z",
        },
        created_at: "2026-04-18T01:01:00Z",
      }).payout_dedupe_key,
    ).toBe("trigger-rain-1:climate-event-1");

    expect(
      financeReviewQueueItemContract.schema.parse({
        schema_version: schemaVersion,
        queue_item_id: "queue-1",
        finance_request_id: "finance-req-1",
        partner_id: "partner-agri-bank",
        partner_reference_id: "partner-case-9",
        actor_id: "actor-farmer-gh-ama",
        actor_role: "farmer",
        country_code: "GH",
        status: "pending_review",
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
        summary: "Awaiting manual review after partner response.",
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:05:00Z",
      }).status,
    ).toBe("pending_review");

    expect(
      traceabilityEventContract.schema.parse({
        schema_version: schemaVersion,
        trace_event_id: "trace-1",
        consignment_id: "cons-1",
        actor_id: "actor-logistics-gh-1",
        actor_role: "cooperative",
        country_code: "GH",
        request_id: "req-trace-1",
        idempotency_key: "idem-trace-1",
        correlation_id: "corr-trace-1",
        causation_id: "cause-trace-1",
        milestone: "dispatched",
        event_reference: "event-ref-1",
        previous_event_reference: null,
        order_index: 1,
        occurred_at: "2026-04-18T01:00:00Z",
        created_at: "2026-04-18T01:00:00Z",
      }).milestone,
    ).toBe("dispatched");

    expect(
      evidenceAttachmentContract.schema.parse({
        schema_version: schemaVersion,
        evidence_attachment_id: "evidence-1",
        trace_event_id: "trace-1",
        consignment_id: "cons-1",
        actor_id: "actor-logistics-gh-1",
        country_code: "GH",
        media_type: "image/jpeg",
        file_name: "handoff-proof.jpg",
        storage_url: "https://example.com/handoff-proof.jpg",
        checksum_sha256: "a".repeat(64),
        validation_state: "validated",
        captured_at: "2026-04-18T01:01:00Z",
        created_at: "2026-04-18T01:02:00Z",
      }).trace_event_id,
    ).toBe("trace-1");

    expect(
      consignmentContract.schema.parse({
        schema_version: schemaVersion,
        consignment_id: "cons-1",
        actor_id: "actor-farmer-gh-ama",
        country_code: "GH",
        partner_reference_id: "partner-case-9",
        status: "in_transit",
        current_custody_actor_id: "actor-logistics-gh-1",
        correlation_id: "corr-trace-1",
        created_at: "2026-04-18T01:00:00Z",
        updated_at: "2026-04-18T01:05:00Z",
      }).consignment_id,
    ).toBe("cons-1");
  });
});

describe("C-007 admin analytics, rollout, and observability contracts", () => {
  it("validates admin analytics mart snapshots with reconciled service totals", () => {
    const summary = adminServiceLevelSummaryContract.schema.parse({
      schema_version: schemaVersion,
      request_id: "req-admin-analytics-1",
      actor_id: "system:test",
      country_code: "GH",
      channel: "api",
      service_name: "marketplace",
      slo_id: null,
      alert_severity: null,
      audit_event_id: 41,
      generated_at: "2026-04-19T01:30:00Z",
      total_records: 5,
      healthy_records: 4,
      degraded_records: 1,
      empty_records: 0,
      health_state: "degraded",
      last_recorded_at: "2026-04-19T01:25:00Z",
      provenance: [
        {
          citation_id: "marketplace:listings",
          source_service: "marketplace",
          entity_type: "listings",
          record_count: 5,
          last_recorded_at: "2026-04-19T01:25:00Z",
          coverage_state: "current",
          note: "Published listing revisions available for admin rollups.",
        },
      ],
    });

    expect(summary.total_records).toBe(5);

    expect(
      adminAnalyticsSnapshotContract.schema.parse({
        schema_version: schemaVersion,
        request_id: "req-admin-analytics-1",
        actor_id: "system:test",
        country_code: "GH",
        channel: "api",
        service_name: "admin_control_plane",
        slo_id: null,
        alert_severity: null,
        audit_event_id: 42,
        generated_at: "2026-04-19T01:30:00Z",
        window_started_at: "2026-04-19T00:30:00Z",
        window_ended_at: "2026-04-19T01:30:00Z",
        summaries: [summary],
        provenance: summary.provenance,
        stale_services: [],
      }).summaries[0].service_name,
    ).toBe("marketplace");
  });

  it("rejects rollout controls without bounded limited-release metadata", () => {
    expect(
      rolloutControlInputContract.schema.safeParse({
        schema_version: schemaVersion,
        request_id: "req-rollout-1",
        actor_id: "system:test",
        country_code: "GH",
        channel: "api",
        service_name: "rollout_control",
        slo_id: "EP-005",
        alert_severity: "warning",
        audit_event_id: 0,
        idempotency_key: "idem-rollout-1",
        actor_role: "admin",
        scope_key: "marketplace:ghana",
        intent: "limited_release",
        reason_code: "risk_hold",
        reason_detail: "Holding release while partner credentials are validated.",
      }).success,
    ).toBe(false);

    expect(
      rolloutStatusContract.schema.parse({
        schema_version: schemaVersion,
        request_id: "req-rollout-1",
        actor_id: "system:test",
        country_code: "GH",
        channel: "api",
        service_name: "rollout_control",
        slo_id: "EP-005",
        alert_severity: "warning",
        audit_event_id: 51,
        actor_role: "admin",
        scope_key: "marketplace:ghana",
        state: "limited_release",
        previous_state: "hold",
        intent: "limited_release",
        reason_code: "risk_hold",
        reason_detail: "Holding release while partner credentials are validated.",
        limited_release_percent: 20,
        changed_at: "2026-04-19T01:35:00Z",
      }).limited_release_percent,
    ).toBe(20);
  });

  it("validates replay-safe telemetry observations and release-readiness status", () => {
    const observation = telemetryObservationInputContract.schema.parse({
      schema_version: schemaVersion,
      request_id: "req-telemetry-1",
      actor_id: "system:test",
      country_code: "GH",
      channel: "api",
      service_name: "marketplace",
      slo_id: "PF-001",
      alert_severity: "none",
      audit_event_id: 0,
      idempotency_key: "idem-telemetry-1",
      observation_id: "obs-marketplace-1",
      source_kind: "api_runtime",
      window_started_at: "2026-04-19T01:00:00Z",
      window_ended_at: "2026-04-19T01:05:00Z",
      success_count: 99,
      error_count: 1,
      sample_count: 100,
      latency_p95_ms: 180,
      stale_after_seconds: 900,
      release_blocking: true,
      note: "Primary marketplace requests remained inside target.",
    });

    expect(
      telemetryObservationRecordContract.schema.parse({
        ...observation,
        audit_event_id: 61,
        ingested_at: "2026-04-19T01:05:05Z",
      }).audit_event_id,
    ).toBe(61);

    const sloEvaluation = sloEvaluationContract.schema.parse({
      schema_version: schemaVersion,
      request_id: "req-telemetry-1",
      actor_id: "system:test",
      country_code: "GH",
      channel: "api",
      service_name: "marketplace",
      slo_id: "PF-001",
      alert_severity: "warning",
      audit_event_id: 62,
      objective_kind: "success_rate",
      objective_target: 99,
      observed_value: 99,
      status: "healthy",
      breach_count: 0,
      window_started_at: "2026-04-19T01:00:00Z",
      window_ended_at: "2026-04-19T01:05:00Z",
      supporting_observation_ids: ["obs-marketplace-1"],
      rationale: "Observed success rate meets the release gate threshold.",
      evaluated_at: "2026-04-19T01:05:05Z",
    });

    expect(
      releaseReadinessStatusContract.schema.parse({
        schema_version: schemaVersion,
        request_id: "req-release-readiness-1",
        actor_id: "system:test",
        country_code: "GH",
        channel: "api",
        service_name: "admin_control_plane",
        slo_id: "PF-004",
        alert_severity: "warning",
        audit_event_id: 63,
        generated_at: "2026-04-19T01:06:00Z",
        readiness_status: "degraded",
        blocking_reasons: ["marketplace rollout remains limited-release"],
        rollout_states: [
          {
            schema_version: schemaVersion,
            request_id: "req-rollout-1",
            actor_id: "system:test",
            country_code: "GH",
            channel: "api",
            service_name: "rollout_control",
            slo_id: "EP-005",
            alert_severity: "warning",
            audit_event_id: 51,
            actor_role: "admin",
            scope_key: "marketplace:ghana",
            state: "limited_release",
            previous_state: "hold",
            intent: "limited_release",
            reason_code: "risk_hold",
            reason_detail: "Holding release while partner credentials are validated.",
            limited_release_percent: 20,
            changed_at: "2026-04-19T01:35:00Z",
          },
        ],
        slo_evaluations: [sloEvaluation],
        telemetry_freshness_state: "healthy",
      }).telemetry_freshness_state,
    ).toBe("healthy");
  });
});

describe("R1 control-plane contract integrity", () => {
  it("rejects schema drift, unknown fields, and missing metadata for control-plane DTOs", () => {
    expect(
      adminAnalyticsSnapshotContract.schema.safeParse({
        schema_version: "2026-04-19.wave2",
        request_id: "req-analytics-1",
        actor_id: "actor-1",
        country_code: "GH",
        channel: "api",
        service_name: "admin_control_plane",
        slo_id: null,
        alert_severity: "warning",
        audit_event_id: 0,
        generated_at: "2026-04-20T00:00:00Z",
        window_started_at: "2026-04-19T23:00:00Z",
        window_ended_at: "2026-04-20T00:00:00Z",
        summaries: [
          {
            schema_version: schemaVersion,
            request_id: "req-analytics-1",
            actor_id: "actor-1",
            country_code: "GH",
            channel: "api",
            service_name: "admin_control_plane",
            slo_id: null,
            alert_severity: "warning",
            audit_event_id: 0,
            generated_at: "2026-04-20T00:00:00Z",
            total_records: 1,
            healthy_records: 0,
            degraded_records: 1,
            empty_records: 0,
            health_state: "degraded",
            last_recorded_at: null,
            provenance: [
              {
                citation_id: "prov-1",
                source_service: "admin_control_plane",
                entity_type: "snapshot",
                record_count: 1,
                last_recorded_at: null,
                coverage_state: "degraded",
                note: "Admin telemetry is stale.",
              },
            ],
          },
        ],
        provenance: [
          {
            citation_id: "prov-1",
            source_service: "admin_control_plane",
            entity_type: "snapshot",
            record_count: 1,
            last_recorded_at: null,
            coverage_state: "degraded",
            note: "Admin telemetry is stale.",
          },
        ],
        stale_services: ["admin_control_plane"],
      }).success,
    ).toBe(false);

    expect(
      telemetryObservationInputContract.schema.safeParse({
        schema_version: schemaVersion,
        request_id: "req-telemetry-1",
        actor_id: "actor-1",
        country_code: "GH",
        channel: "api",
        service_name: "admin_control_plane",
        slo_id: "api-latency",
        alert_severity: "warning",
        audit_event_id: 0,
        idempotency_key: "idem-telemetry-1",
        observation_id: "obs-1",
        source_kind: "api_runtime",
        window_started_at: "2026-04-19T23:55:00Z",
        window_ended_at: "2026-04-20T00:00:00Z",
        success_count: 9,
        error_count: 1,
        sample_count: 10,
        latency_p95_ms: 1200,
        stale_after_seconds: 300,
        release_blocking: true,
        note: "High latency",
        unexpected: true,
      }).success,
    ).toBe(false);

    expect(
      rolloutControlInputContract.schema.safeParse({
        schema_version: schemaVersion,
        actor_id: "actor-1",
        country_code: "GH",
        channel: "api",
        service_name: "rollout_control",
        slo_id: null,
        alert_severity: null,
        audit_event_id: 0,
        idempotency_key: "idem-rollout-1",
        actor_role: "admin",
        scope_key: "gh-admin",
        intent: "freeze",
        reason_code: "manual_freeze",
        reason_detail: "Telemetry freshness breached for admin control plane.",
      }).success,
    ).toBe(false);
  });

  it("keeps control-plane source artifact references live on disk", () => {
    const controlPlaneContracts = contractCatalog.filter((contract) =>
      ["analytics", "observability", "config"].includes(contract.domain),
    );

    for (const contract of controlPlaneContracts) {
      for (const artifact of contract.sourceArtifacts) {
        expect(
          existsSync(path.join(repoRoot, artifact)),
          `${contract.id} references missing source artifact ${artifact}`,
        ).toBe(true);
      }
    }
  });
});

describe("R1 config contracts", () => {
  it("enforces typed feature-flag, rollout-policy, environment, and country-pack runtime rules", () => {
    expect(
      featureFlagContract.schema.safeParse({
        schema_version: schemaVersion,
        flag_key: "admin.release.readiness",
        owner_service: "admin_control_plane",
        description: "Conditional release readiness visibility by country.",
        state: "conditional",
        enabled_by_default: false,
        country_codes: ["GH"],
        channel_allowlist: ["api"],
        actor_role_allowlist: ["admin"],
        rollout_policy_key: null,
        expires_at: null,
      }).success,
    ).toBe(false);

    expect(
      rolloutPolicyContract.schema.safeParse({
        schema_version: schemaVersion,
        policy_key: "gh-canary",
        environment: "staging",
        mode: "limited_release",
        country_codes: ["GH"],
        channel_allowlist: ["api"],
        actor_subset_required: true,
        limited_release_percent: null,
        reason_code: "canary_only",
        updated_at: "2026-04-20T00:00:00Z",
      }).success,
    ).toBe(false);

    expect(
      environmentProfileContract.schema.safeParse({
        schema_version: schemaVersion,
        environment: "staging",
        public_schema_version: "2026-04-19.wave2",
        allowed_schema_versions: [schemaVersion],
        default_country_code: "GH",
        supported_country_codes: ["GH", "KE"],
        feature_flag_keys: ["admin.release.readiness"],
        rollout_policy_keys: ["gh-canary"],
        telemetry_collection_enabled: true,
        admin_api_enabled: true,
      }).success,
    ).toBe(false);

    expect(
      countryPackRuntimeContract.schema.safeParse({
        schema_version: schemaVersion,
        environment: "production",
        country_pack: {
          schema_version: schemaVersion,
          country_code: "GH",
          region: "west_africa",
          currency: "GHS",
          default_locale: "en-GH",
          supported_locales: ["en-GH"],
          supported_channels: ["ussd", "whatsapp"],
          legal_notices: [
            {
              notice_id: "privacy-gh",
              locale: "en-GH",
              title: "Privacy",
              body_markdown: "Required legal notice.",
              required_for_scopes: ["identity.core"],
            },
          ],
          regulated_mutation_requires_consent: true,
        },
        feature_flag_keys: ["admin.release.readiness"],
        rollout_policy_keys: ["gh-canary"],
        config_revision: "r1-2026-04-20",
        legal_notice_checksum: "abcd1234efgh5678",
      }).success,
    ).toBe(true);
  });
});
