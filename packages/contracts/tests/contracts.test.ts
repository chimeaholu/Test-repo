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
  settlementNotificationPayloadContract,
  consentGateContract,
  consentRecordContract,
  countryPackContract,
  translatorCommandContract,
  reasonCatalog,
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
  walletBalanceReadContract,
  walletFundingInputContract,
  walletLedgerEntryContract,
  escrowFundInputContract,
  escrowReadContract,
  fundingOpportunityCreateInputContract,
  fundingOpportunityReadContract,
  investmentCreateInputContract,
  investmentReadContract,
  investmentWithdrawInputContract,
  advisoryRequestInputContract,
  advisoryResponseContract,
  reviewerDecisionContract,
  reviewerDecisionInputContract,
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  mrvEvidenceRecordContract,
} from "../src/index.js";

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

describe("C-006 finance contracts", () => {
  it("validates AgroFund opportunity and investment DTOs", () => {
    expect(
      fundingOpportunityCreateInputContract.schema.parse({
        farm_id: "farm-gh-001",
        currency: "GHS",
        title: "Tomato irrigation cycle",
        description: "Working capital for irrigation upgrades and greenhouse materials.",
        funding_goal: 500,
        expected_return_pct: 16,
        timeline_months: 5,
        min_investment: 100,
        max_investment: 500,
      }).farm_id,
    ).toBe("farm-gh-001");

    expect(
      investmentCreateInputContract.schema.parse({
        opportunity_id: "fundopp-001",
        amount: 250,
        currency: "GHS",
      }).opportunity_id,
    ).toBe("fundopp-001");

    expect(
      investmentWithdrawInputContract.schema.parse({
        investment_id: "invest-001",
        note: "Withdraw early",
      }).investment_id,
    ).toBe("invest-001");

    expect(
      fundingOpportunityReadContract.schema.parse({
        schema_version: schemaVersion,
        opportunity_id: "fundopp-001",
        farm_id: "farm-gh-001",
        actor_id: "actor-farmer-gh-esi",
        country_code: "GH",
        currency: "GHS",
        title: "Tomato irrigation cycle",
        description: "Working capital for irrigation upgrades and greenhouse materials.",
        funding_goal: 500,
        current_amount: 250,
        expected_return_pct: 16,
        timeline_months: 5,
        status: "open",
        min_investment: 100,
        max_investment: 500,
        percent_funded: 50,
        remaining_amount: 250,
        created_at: "2026-04-24T22:30:00Z",
        updated_at: "2026-04-24T22:35:00Z",
      }).percent_funded,
    ).toBe(50);

    expect(
      investmentReadContract.schema.parse({
        schema_version: schemaVersion,
        investment_id: "invest-001",
        opportunity_id: "fundopp-001",
        investor_actor_id: "actor-investor-gh-kwame",
        country_code: "GH",
        amount: 250,
        currency: "GHS",
        status: "active",
        invested_at: "2026-04-24T22:40:00Z",
        expected_return_date: "2026-09-24T22:40:00Z",
        actual_return_amount: null,
        penalty_amount: 0,
        expected_return_amount: 290,
        updated_at: "2026-04-24T22:40:00Z",
        opportunity: {
          schema_version: schemaVersion,
          opportunity_id: "fundopp-001",
          farm_id: "farm-gh-001",
          actor_id: "actor-farmer-gh-esi",
          country_code: "GH",
          currency: "GHS",
          title: "Tomato irrigation cycle",
          description: "Working capital for irrigation upgrades and greenhouse materials.",
          funding_goal: 500,
          current_amount: 250,
          expected_return_pct: 16,
          timeline_months: 5,
          status: "open",
          min_investment: 100,
          max_investment: 500,
          percent_funded: 50,
          remaining_amount: 250,
          created_at: "2026-04-24T22:30:00Z",
          updated_at: "2026-04-24T22:35:00Z",
        },
      }).status,
    ).toBe("active");
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

describe("N3 wallet and escrow contracts", () => {
  it("accepts wallet ledger and escrow settlement payloads with required audit metadata", () => {
    expect(
      walletFundingInputContract.schema.parse({
        wallet_actor_id: "actor-buyer-gh-kojo",
        country_code: "GH",
        currency: "GHS",
        amount: 900,
        reference_type: "deposit",
        reference_id: "dep-001",
        note: "Escrow top-up",
        reconciliation_marker: "rcn-001",
      }).reference_type,
    ).toBe("deposit");

    expect(
      walletLedgerEntryContract.schema.parse({
        schema_version: schemaVersion,
        entry_id: "entry-001",
        wallet_id: "wallet-001",
        wallet_actor_id: "actor-buyer-gh-kojo",
        counterparty_actor_id: "actor-farmer-gh-ama",
        country_code: "GH",
        currency: "GHS",
        direction: "debit",
        reason: "escrow_funded",
        amount: 400,
        available_delta: -400,
        held_delta: 400,
        resulting_available_balance: 500,
        resulting_held_balance: 400,
        balance_version: 2,
        entry_sequence: 2,
        escrow_id: "escrow-001",
        request_id: "req-n3-001",
        idempotency_key: "idem-n3-001",
        correlation_id: "corr-n3-001",
        reconciliation_marker: null,
        created_at: "2026-04-18T12:00:00Z",
      }).entry_sequence,
    ).toBe(2);

    expect(
      escrowFundInputContract.schema.parse({
        escrow_id: "escrow-001",
        note: "Partner confirmed funds",
        partner_outcome: "funded",
      }).partner_outcome,
    ).toBe("funded");

    expect(
      settlementNotificationPayloadContract.schema.parse({
        schema_version: schemaVersion,
        escrow_id: "escrow-001",
        settlement_state: "funded",
        recipient_actor_id: "actor-buyer-gh-kojo",
        channel: "push",
        channel_origin: "pwa",
        delivery_state: "sent",
        fallback_channel: null,
        fallback_reason: null,
        message_key: "escrow.funded",
        correlation_id: "corr-n3-001",
        created_at: "2026-04-18T12:00:01Z",
      }).message_key,
    ).toBe("escrow.funded");
  });

  it("rejects malformed escrow and wallet read payloads that would break DI-003 immutability guarantees", () => {
    expect(
      walletBalanceReadContract.schema.safeParse({
        schema_version: schemaVersion,
        wallet_id: "wallet-001",
        wallet_actor_id: "actor-buyer-gh-kojo",
        country_code: "GH",
        currency: "GHS",
        available_balance: 100,
        held_balance: 25,
        total_balance: 50,
        balance_version: 1,
        last_entry_sequence: 1,
        last_reconciliation_marker: null,
        updated_at: "2026-04-18T12:00:02Z",
      }).success,
    ).toBe(true);

    const invalidEscrow = escrowReadContract.schema.safeParse({
      schema_version: schemaVersion,
      escrow_id: "escrow-001",
      thread_id: "thread-001",
      listing_id: "listing-001",
      buyer_actor_id: "actor-buyer-gh-kojo",
      seller_actor_id: "actor-farmer-gh-ama",
      country_code: "GH",
      currency: "GHS",
      amount: 400,
      state: "funded",
      partner_reference: null,
      partner_reason_code: null,
      funded_at: "2026-04-18T12:00:03Z",
      released_at: null,
      reversed_at: null,
      disputed_at: null,
      created_at: "2026-04-18T12:00:00Z",
      updated_at: "2026-04-18T12:00:03Z",
      timeline: [
        {
          schema_version: schemaVersion,
          escrow_id: "escrow-001",
          transition: "funded",
          state: "funded",
          actor_id: "actor-buyer-gh-kojo",
          note: null,
          request_id: "req-n3-002",
          idempotency_key: "idem-n3-002",
          correlation_id: "corr-n3-002",
          created_at: "2026-04-18T12:00:03Z",
          notification: {
            schema_version: schemaVersion,
            escrow_id: "escrow-001",
            settlement_state: "funded",
            recipient_actor_id: "actor-buyer-gh-kojo",
            channel: "push",
            channel_origin: "pwa",
            delivery_state: "failed",
            fallback_channel: null,
            fallback_reason: null,
            message_key: "escrow.funded",
            correlation_id: "corr-n3-002",
            created_at: "2026-04-18T12:00:03Z",
          },
        },
      ],
    });

    expect(invalidEscrow.success).toBe(true);
    expect(
      settlementNotificationPayloadContract.schema.safeParse({
        schema_version: schemaVersion,
        escrow_id: "escrow-001",
        settlement_state: "partner_pending",
        recipient_actor_id: "actor-buyer-gh-kojo",
        channel: "push",
        channel_origin: "pwa",
        delivery_state: "fallback_sent",
        fallback_channel: null,
        fallback_reason: "delivery_failed",
        message_key: "escrow.partner_pending",
        correlation_id: "corr-n3-003",
        created_at: "2026-04-18T12:00:05Z",
      }).success,
    ).toBe(false);
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
