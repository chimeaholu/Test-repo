from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class FinanceRequestRecord(WorkflowBase):
    __tablename__ = "finance_requests"
    __table_args__ = (
        UniqueConstraint("finance_request_id", name="uq_finance_requests_finance_request_id"),
        UniqueConstraint("request_id", name="uq_finance_requests_request_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    finance_request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    case_reference: Mapped[str] = mapped_column(String(128), nullable=False)
    product_type: Mapped[str] = mapped_column(String(64), nullable=False)
    requested_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    partner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    responsibility_boundary: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    policy_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    transcript_entries: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class FinanceDecisionRecord(WorkflowBase):
    __tablename__ = "finance_decisions"
    __table_args__ = (
        UniqueConstraint("decision_id", name="uq_finance_decisions_decision_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(64), nullable=False)
    finance_request_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("finance_requests.finance_request_id"),
        nullable=False,
    )
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    decision_source: Mapped[str] = mapped_column(String(32), nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    reason_code: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    responsibility_boundary: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    policy_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    transcript_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class InsuranceTriggerRecord(WorkflowBase):
    __tablename__ = "insurance_triggers"
    __table_args__ = (
        UniqueConstraint("trigger_id", name="uq_insurance_triggers_trigger_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trigger_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    partner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    product_code: Mapped[str] = mapped_column(String(64), nullable=False)
    climate_signal: Mapped[str] = mapped_column(String(32), nullable=False)
    comparator: Mapped[str] = mapped_column(String(8), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float(), nullable=False)
    threshold_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    evaluation_window_hours: Mapped[int] = mapped_column(Integer(), nullable=False)
    threshold_source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    threshold_source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    threshold_source_reference: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    payout_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    payout_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    policy_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class InsuranceEvaluationRecord(WorkflowBase):
    __tablename__ = "insurance_evaluations"
    __table_args__ = (
        UniqueConstraint("evaluation_id", name="uq_insurance_evaluations_evaluation_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    evaluation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    trigger_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("insurance_triggers.trigger_id"),
        nullable=False,
    )
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    source_event_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_observation_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    observed_value: Mapped[float] = mapped_column(Float(), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float(), nullable=False)
    evaluation_state: Mapped[str] = mapped_column(String(32), nullable=False)
    triggered: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    payout_dedupe_key: Mapped[str] = mapped_column(String(160), nullable=False)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    climate_source_reference: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    payout_event_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class InsurancePayoutEventRecord(WorkflowBase):
    __tablename__ = "insurance_payout_events"
    __table_args__ = (
        UniqueConstraint("payout_event_id", name="uq_insurance_payout_events_payout_event_id"),
        UniqueConstraint("payout_dedupe_key", name="uq_insurance_payout_events_payout_dedupe_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    payout_event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    trigger_id: Mapped[str] = mapped_column(String(64), nullable=False)
    evaluation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    partner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    partner_reference_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    payout_dedupe_key: Mapped[str] = mapped_column(String(160), nullable=False)
    payout_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    payout_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    climate_source_reference: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
