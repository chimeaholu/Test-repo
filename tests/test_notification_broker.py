import pytest

from agro_v2.escrow import EscrowFundingStatus, EscrowOrchestrationService, EscrowState
from agro_v2.ledger import LedgerEntry, WalletLedgerService
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
    ResumableOperation,
)
from agro_v2.negotiation import NegotiationWorkflow
from agro_v2.notification_broker import (
    BrokerChannel,
    DeliveryState,
    NotificationBroker,
    NotificationBrokerError,
    NotificationBrokerRequest,
    NotificationIntentType,
    NotificationRecipientProfile,
)
from agro_v2.settlement_notifications import (
    NotificationRecipient,
    SettlementNotificationRequest,
)


def build_registry(push_budget: int = 220) -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="2026-04-13",
            payload_budgets=(
                PayloadBudget("market.offers.mutate", max_bytes=200),
                PayloadBudget("notifications.push.deliver", max_bytes=push_budget),
            ),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(
                ResumableOperation(
                    operation_name="market.offers.mutate",
                    token_ttl_seconds=900,
                ),
            ),
        )
    )
    return registry


def build_negotiation() -> object:
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00+00:00")
    workflow.create_thread(
        thread_id="thread-b043",
        listing_id="listing-b043",
        buyer_id="buyer-1",
        seller_id="seller-1",
        currency="GHS",
        opening_actor_id="buyer-1",
        opening_amount_minor=420000,
        opening_note="initial bid",
    )
    workflow.request_human_confirmation(
        thread_id="thread-b043",
        requested_by="seller-1",
        required_confirmer_id="buyer-1",
        note="approve final terms",
    )
    return workflow.confirm(
        thread_id="thread-b043",
        confirmer_id="buyer-1",
        approved=True,
    )


def build_escrow_record():
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
        escrow_id="escrow-b043",
        negotiation=build_negotiation(),
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-b043",
    )
    service.fund_escrow(
        escrow_id="escrow-b043",
        actor_id="buyer-1",
        idempotency_key="fund-b043",
        payment_reference="pay-b043",
    )
    return service.read_escrow("escrow-b043")


def build_settlement_request(**overrides) -> SettlementNotificationRequest:
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


def test_settlement_update_preserves_delivery_state_parity_across_whatsapp_sms_and_push():
    broker = NotificationBroker(profile_registry=build_registry())

    plan = broker.plan(
        NotificationBrokerRequest(
            notification_id="notif-43-1",
            intent_type=NotificationIntentType.SETTLEMENT_UPDATE,
            recipient=NotificationRecipientProfile(
                contact_id="farmer-123",
                locale="fr",
                phone_number="+2335550100",
                device_token="device-43",
                preferred_channels=(
                    BrokerChannel.WHATSAPP,
                    BrokerChannel.PUSH,
                    BrokerChannel.SMS,
                ),
            ),
            body="Settlement funded",
            profile_version="2026-04-13",
            settlement_request=build_settlement_request(delivery_failed=True),
        )
    )

    assert plan.attempted_channels == (
        BrokerChannel.WHATSAPP,
        BrokerChannel.SMS,
        BrokerChannel.PUSH,
    )
    assert plan.final_channel == BrokerChannel.SMS
    assert plan.final_state == DeliveryState.FALLBACK_SENT
    assert [delivery.state for delivery in plan.deliveries] == [
        DeliveryState.SENT,
        DeliveryState.FALLBACK_SENT,
        DeliveryState.SENT,
    ]
    assert {delivery.parity_key for delivery in plan.deliveries} == {"settlement_update"}


def test_push_preference_routes_to_push_when_budget_allows():
    broker = NotificationBroker(profile_registry=build_registry())

    plan = broker.plan(
        NotificationBrokerRequest(
            notification_id="notif-43-2",
            intent_type=NotificationIntentType.SYSTEM_ALERT,
            recipient=NotificationRecipientProfile(
                contact_id="ops-1",
                locale="en",
                device_token="device-43",
                preferred_channels=(BrokerChannel.PUSH, BrokerChannel.SMS),
            ),
            body="Background sync finished successfully.",
            profile_version="2026-04-13",
        )
    )

    assert plan.final_channel == BrokerChannel.PUSH
    assert plan.final_state == DeliveryState.SENT
    assert plan.deliveries[0].channel == BrokerChannel.PUSH


def test_push_budget_failure_falls_back_to_sms():
    broker = NotificationBroker(profile_registry=build_registry(push_budget=80))

    plan = broker.plan(
        NotificationBrokerRequest(
            notification_id="notif-43-3",
            intent_type=NotificationIntentType.SYSTEM_ALERT,
            recipient=NotificationRecipientProfile(
                contact_id="ops-1",
                locale="en",
                phone_number="+2335550101",
                device_token="device-43",
                preferred_channels=(BrokerChannel.PUSH, BrokerChannel.SMS),
            ),
            body="x" * 200,
            profile_version="2026-04-13",
        )
    )

    assert plan.attempted_channels == (BrokerChannel.PUSH, BrokerChannel.SMS)
    assert plan.final_channel == BrokerChannel.SMS
    assert plan.final_state == DeliveryState.SENT
    assert plan.deliveries[0].channel == BrokerChannel.SMS


def test_missing_delivery_path_requires_action():
    broker = NotificationBroker(profile_registry=build_registry())

    plan = broker.plan(
        NotificationBrokerRequest(
            notification_id="notif-43-4",
            intent_type=NotificationIntentType.LISTING_ALERT,
            recipient=NotificationRecipientProfile(
                contact_id="farmer-123",
                locale="en",
                preferred_channels=(BrokerChannel.PUSH, BrokerChannel.SMS),
            ),
            body="Listing update available.",
            profile_version="2026-04-13",
        )
    )

    assert plan.final_channel is None
    assert plan.final_state == DeliveryState.ACTION_REQUIRED
    assert plan.deliveries == ()


def test_settlement_update_requires_settlement_request():
    broker = NotificationBroker(profile_registry=build_registry())

    with pytest.raises(
        NotificationBrokerError,
        match="settlement_request is required",
    ):
        broker.plan(
            NotificationBrokerRequest(
                notification_id="notif-43-5",
                intent_type=NotificationIntentType.SETTLEMENT_UPDATE,
                recipient=NotificationRecipientProfile(
                    contact_id="farmer-123",
                    locale="en",
                    phone_number="+2335550100",
                ),
                body="Settlement update",
                profile_version="2026-04-13",
            )
        )

