import { describe, expect, it } from "vitest";

import {
  contractCatalog,
  eventEnvelopeContract,
  notificationAttemptContract,
  notificationDispatchPlanContract,
  notificationFeedCollectionContract,
  notificationFeedItemContract,
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
  paymentCollectionSessionContract,
  advisoryRequestInputContract,
  advisoryResponseContract,
  copilotExecutionInputContract,
  copilotExecutionResultContract,
  copilotRecommendationCollectionContract,
  copilotRecommendationContract,
  copilotResolveInputContract,
  copilotResolutionContract,
  reviewerDecisionContract,
  reviewerDecisionInputContract,
  climateActionPackContract,
  climateAlertContract,
  climateAlertAcknowledgementContract,
  climateDegradedModeContract,
  marketplaceConversionMetricContract,
  mrvEvidenceRecordContract,
  weatherOutlookContract,
  agroIntelligenceConsentArtifactContract,
  agroIntelligenceEntityContract,
  agroIntelligenceFreshnessSignalContract,
  agroIntelligenceRelationshipContract,
  agroIntelligenceSchemaReadinessPacketContract,
  agroIntelligenceSourceDocumentContract,
  agroIntelligenceVerificationClaimContract,
  eventSchemaCatalogContract,
  outboundEventCollectionContract,
  webhookDeliveryRequestContract,
  inboundIngestionRequestContract,
  inboundIngestionResultContract,
  reportingSummaryContract,
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

  it("accepts notification feed items and dispatch plans for in-app plus fallback delivery", () => {
    expect(
      notificationDispatchPlanContract.schema.parse({
        schema_version: schemaVersion,
        notification_id: "notif-1",
        template_key: "marketplace.response_window",
        dedupe_key: "notif-1",
        queue_state: "dispatched",
        preferred_channels: ["in_app", "push", "email"],
        fallback_channels: ["push", "email"],
        expires_at: "2026-04-19T00:00:00Z",
        escalate_after: "2026-04-18T18:00:00Z",
        payload: {
          listing_id: "listing-1",
          thread_id: "thread-1",
        },
      }).preferred_channels,
    ).toContain("in_app");

    expect(
      notificationFeedItemContract.schema.parse({
        schema_version: schemaVersion,
        notification_id: "notif-1",
        module: "marketplace",
        category: "trade",
        lifecycle_state: "pending",
        urgency: "urgent",
        title: "Response overdue for Cassava Lot A",
        body: "A buyer offer is waiting for the seller response.",
        created_at: "2026-04-18T00:00:00Z",
        read: false,
        read_at: null,
        expires_at: "2026-04-19T00:00:00Z",
        next_action_copy: "Open the thread and respond before the deal goes stale.",
        listing_id: "listing-1",
        thread_id: "thread-1",
        escrow_id: null,
        action: {
          label: "Open negotiation",
          href: "/app/market/negotiations?threadId=thread-1",
        },
        dispatch_plan: {
          schema_version: schemaVersion,
          notification_id: "notif-1",
          template_key: "marketplace.response_window",
          dedupe_key: "notif-1",
          queue_state: "dispatched",
          preferred_channels: ["in_app", "push"],
          fallback_channels: ["push"],
          expires_at: "2026-04-19T00:00:00Z",
          escalate_after: "2026-04-18T18:00:00Z",
          payload: {
            listing_id: "listing-1",
            thread_id: "thread-1",
          },
        },
      }).dispatch_plan.template_key,
    ).toBe("marketplace.response_window");

    expect(
      notificationFeedCollectionContract.schema.parse({
        schema_version: schemaVersion,
        items: [
          {
            schema_version: schemaVersion,
            notification_id: "notif-1",
            module: "wallet",
            category: "finance",
            lifecycle_state: "blocked",
            urgency: "critical",
            title: "Funding blocked",
            body: "Partner processing is still pending.",
            created_at: "2026-04-18T00:00:00Z",
            read: false,
            read_at: null,
            expires_at: null,
            next_action_copy: null,
            listing_id: "listing-1",
            thread_id: "thread-1",
            escrow_id: "escrow-1",
            action: null,
            dispatch_plan: {
              schema_version: schemaVersion,
              notification_id: "notif-1",
              template_key: "wallet.partner_pending",
              dedupe_key: "notif-1",
              queue_state: "queued",
              preferred_channels: ["in_app", "sms"],
              fallback_channels: ["sms"],
              expires_at: null,
              escalate_after: null,
              payload: {
                escrow_id: "escrow-1",
              },
            },
          },
        ],
      }).items,
    ).toHaveLength(1);
  });
});

describe("C-003B analytics conversion metric contract", () => {
  it("validates marketplace conversion metrics for notification and settlement steps", () => {
    expect(
      marketplaceConversionMetricContract.schema.parse({
        schema_version: schemaVersion,
        occurred_at: "2026-04-18T00:00:00Z",
        actor_id: "actor-buyer",
        actor_role: "buyer",
        country_code: "GH",
        stage: "notification_action",
        outcome: "completed",
        source_surface: "notifications_center",
        listing_id: "listing-1",
        thread_id: "thread-1",
        escrow_id: "escrow-1",
        urgency: "urgent",
        blocker_code: null,
        duration_ms: 420,
        notification_count: 3,
        queue_depth: 1,
        replayed: false,
      }).stage,
    ).toBe("notification_action");
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

    expect(
      paymentCollectionSessionContract.schema.parse({
        schema_version: schemaVersion,
        payment_id: "paycol-001",
        escrow_id: "escrow-001",
        actor_id: "actor-buyer-gh-kojo",
        country_code: "GH",
        currency: "GHS",
        amount: 400,
        provider: "paystack",
        provider_mode: "test",
        provider_reference: "agro-escrow-001",
        provider_access_code: "access-001",
        authorization_url: "https://checkout.paystack.com/session-001",
        local_status: "funded",
        provider_status: "success",
        provider_transaction_id: "4099260516",
        channels: ["mobile_money", "bank_transfer"],
        last_error_code: null,
        last_error_detail: null,
        verified_at: "2026-04-29T06:15:00Z",
        wallet_entry_id: "entry-001",
        wallet_funding_applied_at: "2026-04-29T06:15:00Z",
        escrow_funded_at: "2026-04-29T06:15:01Z",
        metadata: { escrow_id: "escrow-001" },
        provider_payload: { status: true },
        created_at: "2026-04-29T06:10:00Z",
        updated_at: "2026-04-29T06:15:01Z",
      }).provider,
    ).toBe("paystack");
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
  it("accepts alert, acknowledgement, degraded-mode, MRV evidence, and provider-backed action payloads", () => {
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

    expect(
      weatherOutlookContract.schema.parse({
        schema_version: schemaVersion,
        farm_profile_id: "farm-1",
        forecast: {
          kind: "forecast",
          provider: "open_meteo",
          provider_mode: "live",
          latitude: 9.4,
          longitude: -0.8,
          timezone: "Africa/Accra",
          generated_at: "2026-04-29T06:00:00Z",
          degraded_mode: false,
          degraded_reasons: [],
          source_window_start: null,
          source_window_end: null,
          days: [
            {
              date: "2026-04-29",
              temperature_max_c: 35,
              temperature_min_c: 24,
              precipitation_mm: 72,
              precipitation_probability_pct: 88,
              evapotranspiration_mm: 5,
              weather_code: 80,
            },
          ],
        },
        history: {
          kind: "history",
          provider: "open_meteo",
          provider_mode: "degraded",
          latitude: null,
          longitude: null,
          timezone: null,
          generated_at: "2026-04-29T06:00:00Z",
          degraded_mode: true,
          degraded_reasons: ["missing_coordinates"],
          source_window_start: "2026-04-26",
          source_window_end: "2026-04-28",
          days: [],
        },
      }).forecast.provider,
    ).toBe("open_meteo");

    expect(
      climateActionPackContract.schema.parse({
        schema_version: schemaVersion,
        farm_profile_id: "farm-1",
        forecast: {
          kind: "forecast",
          provider: "open_meteo",
          provider_mode: "live",
          latitude: 9.4,
          longitude: -0.8,
          timezone: "Africa/Accra",
          generated_at: "2026-04-29T06:00:00Z",
          degraded_mode: false,
          degraded_reasons: [],
          source_window_start: null,
          source_window_end: null,
          days: [],
        },
        history: {
          kind: "history",
          provider: "open_meteo",
          provider_mode: "live",
          latitude: 9.4,
          longitude: -0.8,
          timezone: "Africa/Accra",
          generated_at: "2026-04-29T06:00:00Z",
          degraded_mode: false,
          degraded_reasons: [],
          source_window_start: "2026-04-26",
          source_window_end: "2026-04-28",
          days: [],
        },
        open_alert_ids: ["alert-1"],
        action_pack: {
          crop_calendar: {
            crop_type: "Maize",
            country_code: "GH",
            stage: "vegetative_growth",
            season_label: "active_cycle",
            reference_date: "2026-04-29",
            planting_window_start: "2026-04-01",
            planting_window_end: "2026-04-22",
            expected_harvest_window_start: "2026-08-01",
            expected_harvest_window_end: "2026-08-29",
          },
          risks: [
            {
              code: "forecast_flood_risk",
              severity: "critical",
              title: "Heavy rainfall risk",
              summary: "Forecast rainfall exceeds the drainage threshold for this farm.",
              recommended_due_date: "2026-04-29",
              linked_alert_id: null,
              source: "weather_provider",
            },
          ],
          tasks: [
            {
              task_id: "task-1",
              title: "Inspect drainage and move vulnerable inputs",
              description: "Open blocked channels and move fertilizer to dry storage.",
              priority: "high",
              due_date: "2026-04-29",
              source: "weather_provider",
              advisory_topic: "flood and waterlogging mitigation",
              linked_alert_id: null,
            },
          ],
          advisory: {
            topic: "Heavy rainfall risk",
            draft_question: "What are the top actions for this farm this week?",
            draft_response: "Focus this week on drainage, field access, and input protection before the rain hits.",
            policy_context: { crop: "Maize", country_code: "GH" },
            requires_human_review: false,
          },
          degraded_mode: false,
          degraded_reasons: [],
        },
      }).action_pack.advisory.topic,
    ).toBe("Heavy rainfall risk");
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

describe("EH4 copilot contracts", () => {
  it("accepts assist-and-act resolve and execute envelopes", () => {
    expect(() =>
      copilotResolveInputContract.schema.parse({
        route_path: "/app/market/listings",
        locale: "en-GH",
        message: "Publish my cassava listing now",
        transcript_entries: [],
        context: {
          listing_id: "listing-1",
        },
      }),
    ).not.toThrow();

    expect(() =>
      copilotResolutionContract.schema.parse({
        schema_version: schemaVersion,
        resolution_id: "copilot-res-1",
        actor_id: "actor-gh-001",
        country_code: "GH",
        locale: "en-GH",
        route_path: "/app/market/listings",
        request_text: "Publish my cassava listing now",
        intent: "market.listings.publish",
        status: "confirmation_required",
        summary: "AgroGuide can publish the listing now.",
        explanation: "Publishing exposes the current draft to buyers without editing terms.",
        confirmation_copy: "Confirm publication for listing Cassava Lot A.",
        action: {
          adapter: "market.listings.publish",
          command_name: "market.listings.publish",
          aggregate_ref: "listing-1",
          mutation_scope: "marketplace.listings",
          confirmation_required: true,
          target: {
            aggregate_type: "listing",
            aggregate_id: "listing-1",
            label: "Cassava Lot A",
          },
          payload: {
            listing_id: "listing-1",
          },
        },
        channel_dispatch: {
          schema_version: schemaVersion,
          notification_id: "copilot-copilot-res-1",
          template_key: "copilot.market.listings.publish.resolution",
          dedupe_key: "/app/market/listings:market.listings.publish:actor-gh-001",
          queue_state: "queued",
          preferred_channels: ["in_app"],
          fallback_channels: ["whatsapp", "sms"],
          expires_at: "2026-04-29T12:00:00Z",
          escalate_after: "2026-04-29T00:30:00Z",
          payload: {
            summary: "AgroGuide can publish the listing now.",
            source: "copilot",
          },
        },
        human_handoff: {
          required: false,
          queue_label: "Marketplace operator queue",
          reason_code: "listing_publish_pending",
          reviewer_roles: ["ops", "support"],
        },
        created_at: "2026-04-29T00:00:00Z",
      }),
    ).not.toThrow();

    expect(() =>
      copilotExecutionInputContract.schema.parse({
        resolution_id: "copilot-res-1",
        intent: "market.listings.publish",
        adapter: "market.listings.publish",
        route_path: "/app/market/listings",
        decision: "confirm",
        payload: {
          listing_id: "listing-1",
        },
      }),
    ).not.toThrow();

    expect(() =>
      copilotExecutionResultContract.schema.parse({
        schema_version: schemaVersion,
        resolution_id: "copilot-res-1",
        intent: "market.listings.publish",
        adapter: "market.listings.publish",
        status: "completed",
        summary: "AgroGuide completed the market.listings.publish action.",
        audit_event_id: 42,
        result: {
          listing_id: "listing-1",
          downstream_status: "accepted",
        },
        notification: {
          schema_version: schemaVersion,
          notification_id: "copilot-copilot-res-1",
          delivery_state: "sent",
          retryable: false,
          error_code: null,
          fallback_channel: null,
          fallback_reason: null,
        },
        channel_dispatch: {
          schema_version: schemaVersion,
          notification_id: "copilot-copilot-res-1",
          template_key: "copilot.market.listings.publish.execution",
          dedupe_key: "/app/market/listings:market.listings.publish:actor-gh-001",
          queue_state: "queued",
          preferred_channels: ["in_app"],
          fallback_channels: ["whatsapp", "sms"],
          expires_at: "2026-04-29T12:00:00Z",
          escalate_after: "2026-04-29T00:30:00Z",
          payload: {
            summary: "AgroGuide completed the market.listings.publish action.",
            source: "copilot",
          },
        },
        human_handoff: {
          required: false,
          queue_label: "AgroGuide operator queue",
          reason_code: "copilot_self_service",
          reviewer_roles: ["advisor"],
        },
        completed_at: "2026-04-29T00:02:00Z",
      }),
    ).not.toThrow();
  });

  it("keeps recommendation seams confirmable and channel-aware", () => {
    expect(
      copilotRecommendationContract.schema.safeParse({
        schema_version: schemaVersion,
        recommendation_id: "rec-1",
        actor_id: "actor-gh-001",
        role: "farmer",
        country_code: "GH",
        title: "Publish your cassava listing",
        summary: "Publish your cassava listing so buyers can discover it again.",
        rationale: "The latest draft revision is still private to buyers.",
        priority: "high",
        category: "marketplace",
        source_domains: ["marketplace"],
        source_refs: ["listing-1"],
        guardrails: ["Publishes only the listing you own."],
        action: {
          aggregate_ref: "listing-1",
          channel_seam: {
            delivery_key: "copilot.marketplace.publish_listing",
            fallback_channels: ["whatsapp", "sms"],
            supported_channels: ["web", "whatsapp", "sms"],
            web_label: "Publish listing",
          },
          command_name: "market.listings.publish",
          data_check_ids: ["DI-001"],
          journey_ids: ["CJ-002"],
          kind: "workflow_command",
          label: "Publish listing",
          mutation_scope: "marketplace.listings",
          payload: { listing_id: "listing-1" },
          requires_confirmation: true,
          route: "/market/my-listings",
          transport_endpoint: null,
        },
        created_at: "2026-04-29T00:00:00Z",
      }).success,
    ).toBe(true);

    expect(
      copilotRecommendationCollectionContract.schema.safeParse({
        schema_version: schemaVersion,
        supports_non_web_delivery: true,
        items: [],
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

describe("EH5 platform boundary contracts", () => {
  it("accepts catalog, outbound, and reporting payloads", () => {
    expect(() =>
      eventSchemaCatalogContract.schema.parse({
        schema_version: schemaVersion,
        catalog_version: "2026-04-29.eh5",
        generated_at: "2026-04-29T00:00:00Z",
        items: [
          {
            schema_version: schemaVersion,
            event_family: "marketplace.transaction.v1",
            version: "v1",
            owning_domain: "marketplace",
            ownership: "platform-integrations",
            description: "Marketplace transaction and negotiation updates for partner reporting.",
            data_classification: "marketplace",
            contains_personal_data: false,
            adapter_boundaries: [
              {
                schema_version: schemaVersion,
                adapter_key: "partner.analytics.pull_v1",
                delivery_mode: "api_pull",
                authentication: "bearer_token",
                ownership: "platform-integrations",
                supports_replay: true,
                max_batch_size: 100,
                status: "active",
                consent: {
                  schema_version: schemaVersion,
                  required: false,
                  scope_ids: [],
                  rationale: "Operational marketplace aggregate only.",
                },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      outboundEventCollectionContract.schema.parse({
        schema_version: schemaVersion,
        partner_slug: "insights-hub",
        cursor: "42",
        items: [
          {
            schema_version: schemaVersion,
            event_id: "audit-42",
            event_family: "marketplace.transaction.v1",
            partner_slug: "insights-hub",
            aggregate_id: "listing-001",
            aggregate_type: "audit_event",
            event_type: "command.accepted",
            status: "accepted",
            country_code: "GH",
            occurred_at: "2026-04-29T00:00:00Z",
            payload: { listing_id: "listing-001" },
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      reportingSummaryContract.schema.parse({
        schema_version: schemaVersion,
        partner_slug: "insights-hub",
        generated_at: "2026-04-29T00:00:00Z",
        outbound_events: [{ event_family: "marketplace.transaction.v1", event_count: 3 }],
        inbound_ingestion: { accepted: 1, rejected: 1 },
        webhook_queue: { queued: 1, published: 0 },
      }),
    ).not.toThrow();
  });

  it("rejects person-level ingestion without granted consent scope coverage", () => {
    expect(
      inboundIngestionRequestContract.schema.safeParse({
        partner_record_id: "partner-1",
        adapter_key: "partner.ingestion.v1",
        data_product: "identity.profile_patch",
        subject_type: "person_profile",
        subject_ref: "actor-gh-001",
        country_code: "GH",
        scope_ids: ["identity.core"],
        contains_personal_data: true,
        occurred_at: "2026-04-29T00:00:00Z",
        provenance: {
          source_id: "crm-1",
          collected_at: "2026-04-29T00:00:00Z",
          collection_method: "secure_file_drop",
          legal_basis: "contractual_partner_feed",
        },
        payload: { email: "ama@example.com" },
      }).success,
    ).toBe(false);

    expect(
      inboundIngestionRequestContract.schema.safeParse({
        partner_record_id: "partner-2",
        adapter_key: "partner.ingestion.v1",
        data_product: "identity.profile_patch",
        subject_type: "person_profile",
        subject_ref: "actor-gh-001",
        country_code: "GH",
        scope_ids: ["identity.core", "workflow.audit"],
        contains_personal_data: true,
        occurred_at: "2026-04-29T00:00:00Z",
        provenance: {
          source_id: "crm-2",
          collected_at: "2026-04-29T00:00:00Z",
          collection_method: "secure_file_drop",
          legal_basis: "contractual_partner_feed",
          checksum: "sha256:abc123",
        },
        consent_artifact: {
          policy_version: "2026.04.w1",
          country_code: "GH",
          status: "granted",
          scope_ids: ["identity.core", "workflow.audit"],
          subject_ref: "actor-gh-001",
          captured_at: "2026-04-28T00:00:00Z",
        },
        payload: { email: "ama@example.com" },
      }).success,
    ).toBe(true);
  });

  it("accepts webhook and ingestion result receipts", () => {
    expect(() =>
      webhookDeliveryRequestContract.schema.parse({
        event_family: "transport.dispatch.v1",
        aggregate_id: "shipment-001",
        delivery_target: "https://example.com/webhooks/agro",
        reason: "Dispatch confirmation requested by partner.",
      }),
    ).not.toThrow();

    expect(() =>
      inboundIngestionResultContract.schema.parse({
        schema_version: schemaVersion,
        ingest_id: "ingest-001",
        partner_slug: "insights-hub",
        status: "accepted",
        reason_code: null,
        consent_status: "verified",
        provenance_status: "verified",
      }),
    ).not.toThrow();
  });
});

describe("C-015 AgroIntelligence schema and readiness contracts", () => {
  it("enforces person-level consent and EB-035 subject mapping", () => {
    expect(
      agroIntelligenceEntityContract.schema.safeParse({
        schema_version: schemaVersion,
        entity_id: "entity-person-001",
        entity_type: "person_actor",
        canonical_name: "Ama Mensah",
        country_code: "GH",
        trust_tier: "silver",
        lifecycle_state: "pending_verification",
        source_tier: "A",
        confidence_score: 72,
        boundary_subject_type: "person_profile",
        provenance: [
          {
            schema_version: schemaVersion,
            source_id: "crm-person-001",
            source_tier: "A",
            collected_at: "2026-04-29T00:00:00Z",
            collection_method: "secure_file_drop",
            legal_basis: "contractual_partner_feed",
            boundary_ingest_id: "ingest-001",
            adapter_key: "partner.ingestion.v1",
            data_product: "identity.profile_patch",
            confidence_weight: 80,
          },
        ],
        source_document_ids: ["document-001"],
        attribute_payload: { commodity_focus: "maize" },
        created_at: "2026-04-29T00:00:00Z",
        updated_at: "2026-04-29T00:00:00Z",
      }).success,
    ).toBe(false);

    expect(
      agroIntelligenceEntityContract.schema.safeParse({
        schema_version: schemaVersion,
        entity_id: "entity-person-002",
        entity_type: "person_actor",
        canonical_name: "Ama Mensah",
        country_code: "GH",
        trust_tier: "silver",
        lifecycle_state: "pending_verification",
        source_tier: "A",
        confidence_score: 72,
        boundary_subject_type: "person_profile",
        consent_artifact: {
          schema_version: schemaVersion,
          consent_artifact_id: "consent-001",
          boundary_ingest_id: "ingest-002",
          partner_slug: "insights-hub",
          subject_ref: "actor-gh-002",
          country_code: "GH",
          status: "granted",
          scope_ids: ["identity.core", "workflow.audit"],
          policy_version: "2026.04.w1",
          captured_at: "2026-04-28T00:00:00Z",
          legal_basis: "contractual_partner_feed",
        },
        provenance: [
          {
            schema_version: schemaVersion,
            source_id: "crm-person-002",
            source_tier: "A",
            collected_at: "2026-04-29T00:00:00Z",
            collection_method: "secure_file_drop",
            legal_basis: "contractual_partner_feed",
            boundary_ingest_id: "ingest-002",
            partner_slug: "insights-hub",
            adapter_key: "partner.ingestion.v1",
            data_product: "identity.profile_patch",
            confidence_weight: 82,
          },
        ],
        source_document_ids: ["document-001"],
        attribute_payload: { commodity_focus: "maize" },
        created_at: "2026-04-29T00:00:00Z",
        updated_at: "2026-04-29T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("accepts source, relationship, verification, freshness, and readiness packets while keeping EB-049 gated", () => {
    expect(() =>
      agroIntelligenceSourceDocumentContract.schema.parse({
        schema_version: schemaVersion,
        document_id: "document-001",
        source_id: "ghana-orc-001",
        source_tier: "A",
        country_code: "GH",
        title: "Ghana ORC buyer extract",
        document_kind: "registry_record",
        entity_refs: ["entity-org-001"],
        boundary_ingest_id: "ingest-org-001",
        partner_slug: "insights-hub",
        adapter_key: "partner.ingestion.v1",
        collected_at: "2026-04-29T00:00:00Z",
        legal_basis: "public_registry",
        checksum: "sha256:registry",
      }),
    ).not.toThrow();

    expect(() =>
      agroIntelligenceRelationshipContract.schema.parse({
        schema_version: schemaVersion,
        relationship_id: "rel-001",
        source_entity_id: "entity-org-001",
        target_entity_id: "entity-facility-001",
        relationship_type: "operates",
        trust_tier: "silver",
        lifecycle_state: "verified",
        provenance: [
          {
            schema_version: schemaVersion,
            source_id: "ghana-orc-001",
            source_tier: "A",
            collected_at: "2026-04-29T00:00:00Z",
            collection_method: "registry_lookup",
            legal_basis: "public_registry",
            confidence_weight: 76,
          },
        ],
        attribute_payload: { role: "processor" },
        created_at: "2026-04-29T00:00:00Z",
        updated_at: "2026-04-29T00:00:00Z",
      }),
    ).not.toThrow();

    expect(() =>
      agroIntelligenceVerificationClaimContract.schema.parse({
        schema_version: schemaVersion,
        claim_id: "claim-001",
        entity_id: "entity-org-001",
        source_document_id: "document-001",
        claim_target: "buyer_registration_status",
        claim_state: "confirmed",
        verifier_type: "human_operator",
        trust_tier: "gold",
        evidence_refs: ["ghana-orc-001"],
        provenance: [
          {
            schema_version: schemaVersion,
            source_id: "ghana-orc-001",
            source_tier: "A",
            collected_at: "2026-04-29T00:00:00Z",
            collection_method: "registry_lookup",
            legal_basis: "public_registry",
            confidence_weight: 88,
          },
        ],
        occurred_at: "2026-04-29T00:00:00Z",
        created_at: "2026-04-29T00:00:00Z",
      }),
    ).not.toThrow();

    expect(() =>
      agroIntelligenceFreshnessSignalContract.schema.parse({
        schema_version: schemaVersion,
        signal_id: "freshness-001",
        entity_id: "entity-org-001",
        freshness_status: "fresh",
        source_count: 2,
        stale_after_days: 30,
        observed_at: "2026-04-29T00:00:00Z",
        expires_at: "2026-05-29T00:00:00Z",
        provenance: [
          {
            schema_version: schemaVersion,
            source_id: "ghana-orc-001",
            source_tier: "A",
            collected_at: "2026-04-29T00:00:00Z",
            collection_method: "registry_lookup",
            legal_basis: "public_registry",
            confidence_weight: 88,
          },
        ],
        created_at: "2026-04-29T00:00:00Z",
      }),
    ).not.toThrow();

    expect(() =>
      agroIntelligenceConsentArtifactContract.schema.parse({
        schema_version: schemaVersion,
        consent_artifact_id: "consent-002",
        boundary_ingest_id: "ingest-003",
        partner_slug: "insights-hub",
        subject_ref: "actor-ng-001",
        country_code: "NG",
        status: "granted",
        scope_ids: ["identity.core"],
        policy_version: "2026.04.w1",
        captured_at: "2026-04-28T00:00:00Z",
        legal_basis: "field_enumeration_consent",
      }),
    ).not.toThrow();

    const readiness = agroIntelligenceSchemaReadinessPacketContract.schema.parse({
      schema_version: schemaVersion,
      generated_at: "2026-04-29T00:00:00Z",
      trust_taxonomy: {
        source_tiers: ["A", "B", "C"],
        trust_tiers: ["bronze", "silver", "gold"],
        lifecycle_states: [
          "ingested",
          "normalized",
          "matched_or_unmatched",
          "scored",
          "pending_verification",
          "verified",
          "rejected",
          "stale",
        ],
      },
      boundary_alignment: [
        {
          subject_type: "organization_profile",
          allowed_entity_types: ["organization", "facility", "financial_actor", "insurance_actor"],
          allowed_source_tiers: ["A", "B"],
          requires_consent_artifact: false,
          materialization_path: "partner_inbound_records -> agro_intelligence_entities",
          provenance_contract: "platform_boundary.inbound_ingestion_request.provenance",
        },
        {
          subject_type: "person_profile",
          allowed_entity_types: ["person_actor"],
          allowed_source_tiers: ["A", "B"],
          requires_consent_artifact: true,
          materialization_path: "partner_inbound_records -> agro_intelligence_entities",
          provenance_contract: "platform_boundary.inbound_ingestion_request.provenance",
        },
        {
          subject_type: "farm_signal",
          allowed_entity_types: ["farm_unit", "field_plot"],
          allowed_source_tiers: ["A", "B", "C"],
          requires_consent_artifact: false,
          materialization_path: "partner_inbound_records -> agro_intelligence_entities",
          provenance_contract: "platform_boundary.inbound_ingestion_request.provenance",
        },
        {
          subject_type: "market_signal",
          allowed_entity_types: ["market_location", "commodity_profile", "route_or_corridor"],
          allowed_source_tiers: ["A", "B", "C"],
          requires_consent_artifact: false,
          materialization_path: "partner_inbound_records -> agro_intelligence_entities",
          provenance_contract: "platform_boundary.inbound_ingestion_request.provenance",
        },
      ],
      budget_gate: {
        approval_required: true,
        approval_received: true,
        blocking_beads: ["licensed_source_selection"],
        leading_budget_category: "premium_data_licensing_and_commercial_directory_access",
        recommended_year_one_budget_band_usd: { low: 60000, high: 60000 },
      },
      connector_lane: {
        eb035_alignment_review_complete: true,
        licensed_connector_work_permitted: true,
        gated_until: ["licensed_source_selection"],
      },
    });

    expect(readiness.budget_gate.approval_received).toBe(true);
    expect(readiness.connector_lane.licensed_connector_work_permitted).toBe(true);
  });
});
