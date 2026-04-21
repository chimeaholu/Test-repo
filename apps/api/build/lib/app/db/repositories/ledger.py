from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.ledger import (
    EscrowRecord,
    EscrowTimelineEntry,
    WalletAccount,
    WalletLedgerEntry,
)


def _wallet_id(*, actor_id: str, country_code: str, currency: str) -> str:
    return f"wallet-{country_code.lower()}-{currency.lower()}-{actor_id}"


@dataclass(slots=True)
class WalletBalanceProjection:
    wallet_id: str
    wallet_actor_id: str
    country_code: str
    currency: str
    available_balance: float
    held_balance: float
    total_balance: float
    balance_version: int
    last_entry_sequence: int
    last_reconciliation_marker: str | None
    updated_at: datetime | None


class LedgerRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def ensure_wallet(self, *, actor_id: str, country_code: str, currency: str) -> WalletAccount:
        wallet_id = _wallet_id(actor_id=actor_id, country_code=country_code, currency=currency)
        statement = select(WalletAccount).where(WalletAccount.wallet_id == wallet_id)
        account = self.session.execute(statement).scalar_one_or_none()
        if account is not None:
            return account
        account = WalletAccount(
            wallet_id=wallet_id,
            actor_id=actor_id,
            country_code=country_code,
            currency=currency,
        )
        self.session.add(account)
        self.session.flush()
        return account

    def get_wallet(self, *, actor_id: str, country_code: str, currency: str) -> WalletAccount | None:
        statement = select(WalletAccount).where(
            WalletAccount.actor_id == actor_id,
            WalletAccount.country_code == country_code,
            WalletAccount.currency == currency,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_wallet_balance(
        self, *, actor_id: str, country_code: str, currency: str
    ) -> WalletBalanceProjection:
        account = self.ensure_wallet(actor_id=actor_id, country_code=country_code, currency=currency)
        statement = (
            select(
                func.coalesce(func.sum(WalletLedgerEntry.available_delta), 0.0),
                func.coalesce(func.sum(WalletLedgerEntry.held_delta), 0.0),
                func.coalesce(func.max(WalletLedgerEntry.balance_version), 0),
                func.coalesce(func.max(WalletLedgerEntry.entry_sequence), 0),
                func.max(WalletLedgerEntry.created_at),
            )
            .where(WalletLedgerEntry.wallet_id == account.wallet_id)
        )
        available_balance, held_balance, balance_version, last_entry_sequence, updated_at = (
            self.session.execute(statement).one()
        )
        marker_statement = (
            select(WalletLedgerEntry.reconciliation_marker)
            .where(
                WalletLedgerEntry.wallet_id == account.wallet_id,
                WalletLedgerEntry.reconciliation_marker.is_not(None),
            )
            .order_by(WalletLedgerEntry.entry_sequence.desc(), WalletLedgerEntry.id.desc())
            .limit(1)
        )
        last_reconciliation_marker = self.session.execute(marker_statement).scalar_one_or_none()
        return WalletBalanceProjection(
            wallet_id=account.wallet_id,
            wallet_actor_id=account.actor_id,
            country_code=account.country_code,
            currency=account.currency,
            available_balance=float(available_balance or 0.0),
            held_balance=float(held_balance or 0.0),
            total_balance=float((available_balance or 0.0) + (held_balance or 0.0)),
            balance_version=int(balance_version or 0),
            last_entry_sequence=int(last_entry_sequence or 0),
            last_reconciliation_marker=last_reconciliation_marker,
            updated_at=updated_at,
        )

    def append_entry(
        self,
        *,
        actor_id: str,
        country_code: str,
        currency: str,
        direction: str,
        reason: str,
        amount: float,
        available_delta: float,
        held_delta: float,
        request_id: str,
        idempotency_key: str,
        correlation_id: str,
        counterparty_actor_id: str | None = None,
        escrow_id: str | None = None,
        reconciliation_marker: str | None = None,
        entry_metadata: dict[str, object] | None = None,
    ) -> WalletLedgerEntry:
        projection = self.get_wallet_balance(
            actor_id=actor_id, country_code=country_code, currency=currency
        )
        next_available = projection.available_balance + available_delta
        next_held = projection.held_balance + held_delta
        if next_available < -1e-9:
            raise ValueError("insufficient_available_balance")
        if next_held < -1e-9:
            raise ValueError("insufficient_held_balance")
        entry = WalletLedgerEntry(
            entry_id=f"entry-{uuid4().hex[:12]}",
            wallet_id=projection.wallet_id,
            wallet_actor_id=projection.wallet_actor_id,
            counterparty_actor_id=counterparty_actor_id,
            country_code=country_code,
            currency=currency,
            direction=direction,
            reason=reason,
            amount=amount,
            available_delta=available_delta,
            held_delta=held_delta,
            resulting_available_balance=next_available,
            resulting_held_balance=next_held,
            balance_version=projection.balance_version + 1,
            entry_sequence=projection.last_entry_sequence + 1,
            escrow_id=escrow_id,
            request_id=request_id,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            reconciliation_marker=reconciliation_marker,
            entry_metadata=entry_metadata or {},
        )
        self.session.add(entry)
        self.session.flush()
        return entry

    def list_entries(
        self, *, actor_id: str, country_code: str, currency: str, limit: int = 100
    ) -> list[WalletLedgerEntry]:
        account = self.get_wallet(actor_id=actor_id, country_code=country_code, currency=currency)
        if account is None:
            return []
        statement = (
            select(WalletLedgerEntry)
            .where(WalletLedgerEntry.wallet_id == account.wallet_id)
            .order_by(WalletLedgerEntry.entry_sequence.asc(), WalletLedgerEntry.id.asc())
            .limit(limit)
        )
        return list(self.session.execute(statement).scalars().all())


@dataclass(slots=True)
class EscrowTimelineProjection:
    escrow_id: str
    actor_id: str
    transition: str
    state: str
    note: str | None
    request_id: str
    idempotency_key: str
    correlation_id: str
    notification_payload: dict[str, object] | None
    created_at: datetime


class EscrowRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_escrow(
        self,
        *,
        escrow_id: str,
        thread_id: str,
        listing_id: str,
        buyer_actor_id: str,
        seller_actor_id: str,
        country_code: str,
        currency: str,
        amount: float,
        initiated_by_actor_id: str,
    ) -> EscrowRecord:
        record = EscrowRecord(
            escrow_id=escrow_id,
            thread_id=thread_id,
            listing_id=listing_id,
            buyer_actor_id=buyer_actor_id,
            seller_actor_id=seller_actor_id,
            country_code=country_code,
            currency=currency,
            amount=amount,
            state="initiated",
            partner_reference=None,
            partner_reason_code=None,
            initiated_by_actor_id=initiated_by_actor_id,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_escrow(self, *, escrow_id: str) -> EscrowRecord | None:
        statement = select(EscrowRecord).where(EscrowRecord.escrow_id == escrow_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_escrow_by_thread(self, *, thread_id: str) -> EscrowRecord | None:
        statement = select(EscrowRecord).where(EscrowRecord.thread_id == thread_id)
        return self.session.execute(statement).scalar_one_or_none()

    def list_escrows_for_actor(self, *, actor_id: str, country_code: str) -> list[EscrowRecord]:
        statement = (
            select(EscrowRecord)
            .where(
                EscrowRecord.country_code == country_code,
                (EscrowRecord.buyer_actor_id == actor_id) | (EscrowRecord.seller_actor_id == actor_id),
            )
            .order_by(EscrowRecord.updated_at.desc(), EscrowRecord.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def get_escrow_for_actor(
        self, *, escrow_id: str, actor_id: str, country_code: str
    ) -> EscrowRecord | None:
        statement = select(EscrowRecord).where(
            EscrowRecord.escrow_id == escrow_id,
            EscrowRecord.country_code == country_code,
            (EscrowRecord.buyer_actor_id == actor_id) | (EscrowRecord.seller_actor_id == actor_id),
        )
        return self.session.execute(statement).scalar_one_or_none()

    def transition_escrow(
        self,
        *,
        escrow: EscrowRecord,
        state: str,
        partner_reason_code: str | None = None,
    ) -> EscrowRecord:
        now = datetime.now(tz=UTC)
        escrow.state = state
        escrow.partner_reason_code = partner_reason_code
        if state == "funded":
            escrow.funded_at = now
        elif state == "released":
            escrow.released_at = now
        elif state == "reversed":
            escrow.reversed_at = now
        elif state == "disputed":
            escrow.disputed_at = now
        self.session.add(escrow)
        self.session.flush()
        return escrow

    def append_timeline_entry(
        self,
        *,
        escrow_id: str,
        actor_id: str,
        transition: str,
        state: str,
        note: str | None,
        request_id: str,
        idempotency_key: str,
        correlation_id: str,
        notification_payload: dict[str, object] | None = None,
    ) -> EscrowTimelineEntry:
        entry = EscrowTimelineEntry(
            escrow_id=escrow_id,
            actor_id=actor_id,
            transition=transition,
            state=state,
            note=note,
            request_id=request_id,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            notification_payload=notification_payload,
        )
        self.session.add(entry)
        self.session.flush()
        return entry

    def list_timeline(self, *, escrow_id: str) -> list[EscrowTimelineProjection]:
        statement = (
            select(EscrowTimelineEntry)
            .where(EscrowTimelineEntry.escrow_id == escrow_id)
            .order_by(EscrowTimelineEntry.created_at.asc(), EscrowTimelineEntry.id.asc())
        )
        entries = list(self.session.execute(statement).scalars().all())
        return [
            EscrowTimelineProjection(
                escrow_id=entry.escrow_id,
                actor_id=entry.actor_id,
                transition=entry.transition,
                state=entry.state,
                note=entry.note,
                request_id=entry.request_id,
                idempotency_key=entry.idempotency_key,
                correlation_id=entry.correlation_id,
                notification_payload=entry.notification_payload,
                created_at=entry.created_at,
            )
            for entry in entries
        ]
