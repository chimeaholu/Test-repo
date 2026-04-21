from agro_v2.escrow import EscrowOrchestrationService
from agro_v2.frontend_escrow_wallet_center import FrontendEscrowWalletCenter
from agro_v2.ledger import LedgerEntry, WalletLedgerService
from agro_v2.negotiation import NegotiationWorkflow


def build_record():
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00Z")
    thread = workflow.create_thread(
        thread_id="thread-10",
        listing_id="listing-10",
        buyer_id="buyer-10",
        seller_id="seller-10",
        currency="GHS",
        opening_actor_id="buyer-10",
        opening_amount_minor=500000,
    )
    thread = workflow.request_human_confirmation(
        thread_id=thread.thread_id,
        requested_by="buyer-10",
        required_confirmer_id="seller-10",
    )
    accepted = workflow.confirm(
        thread_id=thread.thread_id,
        confirmer_id="seller-10",
        approved=True,
    )
    ledger = WalletLedgerService(
        entries=(
            LedgerEntry(
                entry_id="seed-buyer-10",
                account_id="wallet-buyer-10",
                currency="GHS",
                amount_minor=600000,
                entry_type="credit",
            ),
        )
    )
    service = EscrowOrchestrationService(
        ledger_service=ledger,
        clock=lambda: "2026-04-13T00:00:00Z",
    )
    record = service.create_escrow(
        escrow_id="escrow-10",
        negotiation=accepted,
        buyer_wallet_id="wallet-buyer-10",
        seller_wallet_id="wallet-seller-10",
        actor_id="buyer-10",
        idempotency_key="create-escrow-10",
    )
    return service.fund_escrow(
        escrow_id=record.escrow_id,
        actor_id="buyer-10",
        idempotency_key="fund-escrow-10",
        payment_reference="pay-10",
    )


def test_escrow_wallet_center_projects_timeline_and_wallet_rows():
    center = FrontendEscrowWalletCenter()
    surface = center.build_surface(build_record())
    audit = center.audit(surface)

    assert [entry.event_type for entry in surface.timeline] == [
        "escrow_initiated",
        "escrow_funded",
    ]
    assert len(surface.wallet_rows) == 3
    assert audit.passed is True
