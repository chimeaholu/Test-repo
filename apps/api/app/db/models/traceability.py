from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class ConsignmentRecord(WorkflowBase):
    __tablename__ = "consignments"
    __table_args__ = (
        UniqueConstraint("consignment_id", name="uq_consignments_consignment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    consignment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    current_custody_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TraceabilityEventRecord(WorkflowBase):
    __tablename__ = "traceability_events"
    __table_args__ = (
        UniqueConstraint("trace_event_id", name="uq_traceability_events_trace_event_id"),
        UniqueConstraint("event_reference", name="uq_traceability_events_event_reference"),
        UniqueConstraint(
            "consignment_id",
            "idempotency_key",
            name="uq_traceability_events_consignment_idempotency",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trace_event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    consignment_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("consignments.consignment_id"),
        nullable=False,
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    causation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    milestone: Mapped[str] = mapped_column(String(32), nullable=False)
    event_reference: Mapped[str] = mapped_column(String(128), nullable=False)
    previous_event_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer(), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
