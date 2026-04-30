from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import AuditBase


class PartnerBoundaryDelivery(AuditBase):
    __tablename__ = "partner_boundary_deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    delivery_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    partner_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    event_family: Mapped[str] = mapped_column(String(120), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(80), nullable=False)
    delivery_mode: Mapped[str] = mapped_column(String(24), nullable=False)
    delivery_target: Mapped[str] = mapped_column(String(240), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    audit_event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PartnerInboundRecord(AuditBase):
    __tablename__ = "partner_inbound_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ingest_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    partner_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    partner_record_id: Mapped[str] = mapped_column(String(120), nullable=False)
    adapter_key: Mapped[str] = mapped_column(String(80), nullable=False)
    data_product: Mapped[str] = mapped_column(String(120), nullable=False)
    subject_type: Mapped[str] = mapped_column(String(32), nullable=False)
    subject_ref: Mapped[str] = mapped_column(String(120), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    scope_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    contains_personal_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    provenance: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    consent_artifact: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    reason_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    audit_event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
