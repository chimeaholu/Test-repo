import pytest

from agro_v2.escrow import (
    EscrowError,
    EscrowFundingStatus,
    EscrowOrchestrationService,
    EscrowState,
)
from agro_v2.ledger import LedgerEntry, WalletLedgerService
from agro_v2.negotiation import NegotiationWorkflow


def build_negotiation() -> object:
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00+00:00")
    workflow.create_thread(
        thread_id="thread-escrow",
        listing_id="listing-escrow",
        buyer_id="buyer-1",
        seller_id="seller-1",
        currency="GHS",
        opening_actor_id="buyer-1",
        opening_amount_minor=420000,
        opening_note="initial bid",
    )
    workflow.request_human_confirmation(
        thread_id="thread-escrow",
        requested_by="seller-1",
        required_confirmer_id="buyer-1",
        note="approve final terms",
    )
    return workflow.confirm(
        thread_id="thread-escrow",
        confirmer_id="buyer-1",
        approved=True,
    )


def build_service() -> EscrowOrchestrationService:
    ledger = WalletLedgerService(
        [
            LedgerEntry("seed-buyer", "wallet-buyer", "GHS", 900000, "credit"),
            LedgerEntry("seed-seller", "wallet-seller", "GHS", 100000, "credit"),
        ]
    )
    return EscrowOrchestrationService(
        ledger_service=ledger,
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )


def test_escrow_create_fund_release_flow_updates_ledger_projection():
    service = build_service()
    negotiation = build_negotiation()
    created = service.create_escrow(
        escrow_id="escrow-1",
        negotiation=negotiation,
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-1",
    )
    funded = service.fund_escrow(
        escrow_id="escrow-1",
        actor_id="buyer-1",
        idempotency_key="fund-1",
        payment_reference="pay-123",
    )
    released = service.release_escrow(
        escrow_id="escrow-1",
        actor_id="ops-1",
        actor_role="finance_ops",
        country_code="GH",
        idempotency_key="release-1",
        hitl_approved=True,
    )

    assert created.state == EscrowState.INITIATED
    assert funded.state == EscrowState.FUNDED
    assert funded.funding_status == EscrowFundingStatus.COMPLETED
    assert released.state == EscrowState.RELEASED
    assert service._ledger.balance("wallet-buyer", "GHS") == 480000
    assert service._ledger.balance("wallet-seller", "GHS") == 520000
    assert service._ledger.balance("escrow:escrow-1", "GHS") == 0


def test_payment_timeout_marks_pending_and_retry_is_idempotent_then_funds():
    service = build_service()
    service.create_escrow(
        escrow_id="escrow-2",
        negotiation=build_negotiation(),
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-2",
    )

    pending = service.fund_escrow(
        escrow_id="escrow-2",
        actor_id="buyer-1",
        idempotency_key="fund-timeout-1",
        payment_reference="pay-124",
        partner_outcome="timeout",
    )
    replayed_pending = service.fund_escrow(
        escrow_id="escrow-2",
        actor_id="buyer-1",
        idempotency_key="fund-timeout-1",
        payment_reference="pay-124",
        partner_outcome="timeout",
    )
    funded = service.fund_escrow(
        escrow_id="escrow-2",
        actor_id="buyer-1",
        idempotency_key="fund-retry-1",
        payment_reference="pay-124",
        partner_outcome="success",
    )

    assert pending.state == EscrowState.INITIATED
    assert pending.funding_status == EscrowFundingStatus.PENDING
    assert replayed_pending.version == pending.version
    assert funded.state == EscrowState.FUNDED
    assert service._ledger.balance("wallet-buyer", "GHS") == 480000
    assert service._ledger.balance("escrow:escrow-2", "GHS") == 420000


def test_release_without_hitl_approval_is_blocked_by_policy():
    service = build_service()
    service.create_escrow(
        escrow_id="escrow-3",
        negotiation=build_negotiation(),
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-3",
    )
    service.fund_escrow(
        escrow_id="escrow-3",
        actor_id="buyer-1",
        idempotency_key="fund-3",
        payment_reference="pay-125",
    )

    with pytest.raises(EscrowError, match="release blocked by policy: hitl_required"):
        service.release_escrow(
            escrow_id="escrow-3",
            actor_id="ops-1",
            actor_role="finance_ops",
            country_code="GH",
            idempotency_key="release-3",
            hitl_approved=False,
        )


def test_reverse_and_dispute_are_terminal_branch_transitions():
    service = build_service()
    service.create_escrow(
        escrow_id="escrow-4",
        negotiation=build_negotiation(),
        buyer_wallet_id="wallet-buyer",
        seller_wallet_id="wallet-seller",
        actor_id="buyer-1",
        idempotency_key="create-4",
    )
    service.fund_escrow(
        escrow_id="escrow-4",
        actor_id="buyer-1",
        idempotency_key="fund-4",
        payment_reference="pay-126",
    )
    disputed = service.dispute_escrow(
        escrow_id="escrow-4",
        actor_id="seller-1",
        idempotency_key="dispute-4",
        note="delivery issue",
    )

    assert disputed.state == EscrowState.DISPUTED
    with pytest.raises(EscrowError, match="only allowed from funded state"):
        service.reverse_escrow(
            escrow_id="escrow-4",
            actor_id="ops-1",
            idempotency_key="reverse-4",
        )


def test_create_requires_accepted_negotiation():
    service = build_service()
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00+00:00")
    negotiation = workflow.create_thread(
        thread_id="thread-open",
        listing_id="listing-open",
        buyer_id="buyer-1",
        seller_id="seller-1",
        currency="GHS",
        opening_actor_id="buyer-1",
        opening_amount_minor=1000,
    )

    with pytest.raises(EscrowError, match="accepted before escrow creation"):
        service.create_escrow(
            escrow_id="escrow-open",
            negotiation=negotiation,
            buyer_wallet_id="wallet-buyer",
            seller_wallet_id="wallet-seller",
            actor_id="buyer-1",
            idempotency_key="create-open",
        )
