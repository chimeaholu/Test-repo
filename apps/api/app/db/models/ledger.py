from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import CommerceBase


class WalletAccount(CommerceBase):
    __tablename__ = "wallet_accounts"
    __table_args__ = (
        UniqueConstraint("wallet_id", name="uq_wallet_accounts_wallet_id"),
        UniqueConstraint(
            "actor_id",
            "country_code",
            "currency",
            name="uq_wallet_accounts_actor_country_currency",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wallet_id: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class WalletLedgerEntry(CommerceBase):
    __tablename__ = "wallet_ledger_entries"
    __table_args__ = (
        UniqueConstraint("entry_id", name="uq_wallet_ledger_entries_entry_id"),
        UniqueConstraint(
            "wallet_id",
            "entry_sequence",
            name="uq_wallet_ledger_entries_wallet_id_entry_sequence",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entry_id: Mapped[str] = mapped_column(String(64), nullable=False)
    wallet_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("wallet_accounts.wallet_id"), nullable=False
    )
    wallet_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    counterparty_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    direction: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[float] = mapped_column(Float(), nullable=False)
    available_delta: Mapped[float] = mapped_column(Float(), nullable=False)
    held_delta: Mapped[float] = mapped_column(Float(), nullable=False)
    resulting_available_balance: Mapped[float] = mapped_column(Float(), nullable=False)
    resulting_held_balance: Mapped[float] = mapped_column(Float(), nullable=False)
    balance_version: Mapped[int] = mapped_column(Integer(), nullable=False)
    entry_sequence: Mapped[int] = mapped_column(Integer(), nullable=False)
    escrow_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reconciliation_marker: Mapped[str | None] = mapped_column(String(128), nullable=True)
    entry_metadata: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class EscrowRecord(CommerceBase):
    __tablename__ = "escrow_records"
    __table_args__ = (
        UniqueConstraint("escrow_id", name="uq_escrow_records_escrow_id"),
        UniqueConstraint("thread_id", name="uq_escrow_records_thread_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    escrow_id: Mapped[str] = mapped_column(String(64), nullable=False)
    thread_id: Mapped[str] = mapped_column(String(64), nullable=False)
    listing_id: Mapped[str] = mapped_column(String(64), nullable=False)
    buyer_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    seller_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[float] = mapped_column(Float(), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    partner_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    partner_reason_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    initiated_by_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    funded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disputed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class EscrowTimelineEntry(CommerceBase):
    __tablename__ = "escrow_timeline_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    escrow_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("escrow_records.escrow_id"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    transition: Mapped[str] = mapped_column(String(32), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    notification_payload: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
