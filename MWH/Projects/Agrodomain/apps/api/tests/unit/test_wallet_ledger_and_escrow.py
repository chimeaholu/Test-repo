from sqlalchemy import select

from app.db.models.ledger import WalletLedgerEntry
from app.db.repositories.ledger import LedgerRepository


def test_ledger_repository_uses_compensating_entries_for_reversal(session) -> None:
    repository = LedgerRepository(session)
    repository.append_entry(
        actor_id="actor-buyer-gh-kojo",
        country_code="GH",
        currency="GHS",
        direction="credit",
        reason="wallet_funded",
        amount=900,
        available_delta=900,
        held_delta=0,
        request_id="req-1",
        idempotency_key="idem-1",
        correlation_id="corr-1",
    )
    repository.append_entry(
        actor_id="actor-buyer-gh-kojo",
        country_code="GH",
        currency="GHS",
        direction="debit",
        reason="escrow_funded",
        amount=400,
        available_delta=-400,
        held_delta=400,
        request_id="req-2",
        idempotency_key="idem-2",
        correlation_id="corr-2",
        escrow_id="escrow-001",
    )
    reversal = repository.append_entry(
        actor_id="actor-buyer-gh-kojo",
        country_code="GH",
        currency="GHS",
        direction="credit",
        reason="escrow_reversed",
        amount=400,
        available_delta=400,
        held_delta=-400,
        request_id="req-3",
        idempotency_key="idem-3",
        correlation_id="corr-3",
        escrow_id="escrow-001",
    )
    session.commit()

    entries = session.execute(
        select(WalletLedgerEntry)
        .where(WalletLedgerEntry.wallet_actor_id == "actor-buyer-gh-kojo")
        .order_by(WalletLedgerEntry.entry_sequence.asc())
    ).scalars().all()
    assert len(entries) == 3
    assert [entry.reason for entry in entries] == [
        "wallet_funded",
        "escrow_funded",
        "escrow_reversed",
    ]
    assert reversal.resulting_available_balance == 900
    assert reversal.resulting_held_balance == 0
