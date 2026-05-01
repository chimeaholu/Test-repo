from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import CommerceBase


class PaymentCollectionRecord(CommerceBase):
    __tablename__ = "payment_collection_records"
    __table_args__ = (
        UniqueConstraint("payment_id", name="uq_payment_collection_records_payment_id"),
        UniqueConstraint(
            "provider",
            "provider_reference",
            name="uq_payment_collection_records_provider_reference",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    payment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    escrow_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount: Mapped[float] = mapped_column(Float(), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_mode: Mapped[str] = mapped_column(String(16), nullable=False)
    provider_reference: Mapped[str] = mapped_column(String(80), nullable=False)
    provider_access_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    authorization_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    local_status: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_status: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_transaction_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    channels: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    provider_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    last_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_error_detail: Mapped[str | None] = mapped_column(String(300), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    wallet_entry_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    wallet_funding_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escrow_funded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
