from dataclasses import replace

import pytest

from agro_v2.escrow import EscrowFundingStatus, EscrowOrchestrationService, EscrowState
from agro_v2.ledger import LedgerEntry, WalletLedgerService
from agro_v2.negotiation import NegotiationWorkflow
from agro_v2.settlement_notifications import (
    NotificationChannel,
    NotificationFeedbackState,
    NotificationRecipient,
    SettlementNotificationError,
    SettlementNotificationPlanner,
    SettlementNotificationRequest,
)


def build_negotiation() -> object:
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00+00:00")
    workflow.create_thread(
        thread_id="thread-b013",
        listing_id="listing-b013",
        buyer_id="buyer-1",
        seller_id="seller-1",
        currency="GHS",
        opening_actor_id="buyer-1",
        opening_amount_minor=420000,
        opening_note="initial bid",
    )
    workflow.request_human_confirmation(
        thread_id="thread-b013",
        requested_by="seller-1",
        required_confirmer_id="buyer-1",
        note="approve final terms",
    )
    return workflow.confirm(
        thread_id="thread-b013",
        confirmer_id="buyer-1",
        approved=True,
    )


def build_escrow_record(
    *,
    funded: bool = True,
    released: bool = False,
    disputed: bool = False,
):
    service = EscrowOrchestrationService(
        ledger_service=WalletLedgerService(
            [
                LedgerEntry("seed-buyer", "wallet-buyer", "GHS", 900000, "credit"),
                LedgerEntry("seed-seller", "wallet-seller", "GHS", 100000, "credit"),
            ]
        ),
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )
    service.create_escrow(
        escrow_id="escrow-b013",
        negotiation=build_negotiation(),
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-b013",
    )
    if funded:
        service.fund_escrow(
            escrow_id="escrow-b013",
            actor_id="buyer-1",
            idempotency_key="fund-b013",
            payment_reference="pay-b013",
        )
    if released:
        service.release_escrow(
            escrow_id="escrow-b013",
            actor_id="ops-1",
            actor_role="finance_ops",
            country_code="GH",
            idempotency_key="release-b013",
            hitl_approved=True,
        )
    if disputed:
        service.dispute_escrow(
            escrow_id="escrow-b013",
            actor_id="seller-1",
            idempotency_key="dispute-b013",
            note="delivery issue",
        )
    return service.read_escrow("escrow-b013")


def build_request(**overrides) -> SettlementNotificationRequest:
    payload = {
        "escrow_record": build_escrow_record(),
        "recipient": NotificationRecipient(
            contact_id="farmer-123",
            phone_number="+2335550100",
            locale="fr",
        ),
        "buyer_name": "Kojo",
        "commodity": "maize",
        "actor_id": "ops-1",
    }
    payload.update(overrides)
    return SettlementNotificationRequest(**payload)


def test_planner_uses_whatsapp_template_for_successful_release_notice():
    planner = SettlementNotificationPlanner()

    plan = planner.plan(
        build_request(
            escrow_record=build_escrow_record(released=True),
        )
    )

    assert plan.status_label == "released"
    assert plan.primary_plan.channel == NotificationChannel.WHATSAPP
    assert plan.primary_plan.template_name == "settlement_update_fr_v1"
    assert plan.final_channel == NotificationChannel.WHATSAPP
    assert plan.feedback_state == NotificationFeedbackState.SENT
    assert plan.channels_attempted == (NotificationChannel.WHATSAPP,)


def test_delivery_failure_triggers_sms_fallback_for_critical_event():
    planner = SettlementNotificationPlanner()

    plan = planner.plan(
        build_request(
            delivery_failed=True,
        )
    )

    assert plan.status_label == "funded"
    assert plan.fallback_reason == "delivery_failed"
    assert plan.fallback_plan is not None
    assert plan.fallback_plan.channel == NotificationChannel.SMS
    assert plan.final_channel == NotificationChannel.SMS
    assert plan.feedback_state == NotificationFeedbackState.FALLBACK_SENT
    assert plan.channels_attempted == (
        NotificationChannel.WHATSAPP,
        NotificationChannel.SMS,
    )


def test_session_expiry_also_triggers_sms_fallback():
    planner = SettlementNotificationPlanner()

    plan = planner.plan(build_request(session_window_expired=True))

    assert plan.fallback_reason == "session_window_expired"
    assert plan.final_channel == NotificationChannel.SMS
    assert plan.requires_retry is False


def test_sms_preference_skips_whatsapp_and_preserves_state_coverage():
    planner = SettlementNotificationPlanner()

    plan = planner.plan(
        build_request(
            recipient=NotificationRecipient(
                contact_id="farmer-123",
                phone_number="+2335550100",
                locale="en",
                preferred_channel=NotificationChannel.SMS,
            ),
            escrow_record=build_escrow_record(disputed=True),
        )
    )

    assert plan.status_label == "disputed"
    assert plan.primary_plan.channel == NotificationChannel.SMS
    assert plan.fallback_plan is None
    assert plan.feedback_state == NotificationFeedbackState.SENT


def test_initiated_escrow_without_funding_status_is_not_notifiable():
    planner = SettlementNotificationPlanner()

    with pytest.raises(
        SettlementNotificationError,
        match="no settlement status to notify",
    ):
        planner.plan(build_request(escrow_record=build_escrow_record(funded=False)))


def test_pending_funding_state_maps_to_actionable_status_label():
    planner = SettlementNotificationPlanner()
    pending_record = build_escrow_record()
    pending_record = replace(
        pending_record,
        state=EscrowState.INITIATED,
        funding_status=EscrowFundingStatus.PENDING,
    )

    plan = planner.plan(build_request(escrow_record=pending_record, network_degraded=True))

    assert plan.status_label == "funding pending"
    assert plan.fallback_reason == "network_degraded"
    assert plan.final_channel == NotificationChannel.SMS
    assert "reply STATUS for retry" in plan.fallback_plan.message_text
