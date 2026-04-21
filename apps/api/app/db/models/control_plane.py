from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class TelemetryObservationRecord(WorkflowBase):
    __tablename__ = "telemetry_observations"
    __table_args__ = (
        UniqueConstraint("observation_id", name="uq_telemetry_observations_observation_id"),
        UniqueConstraint("idempotency_key", name="uq_telemetry_observations_idempotency_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    observation_id: Mapped[str] = mapped_column(String(96), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    service_name: Mapped[str] = mapped_column(String(64), nullable=False)
    slo_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    alert_severity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    audit_event_id: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    latency_p95_ms: Mapped[float] = mapped_column(Float, nullable=False)
    stale_after_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    release_blocking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    note: Mapped[str | None] = mapped_column(String(240), nullable=True)
    schema_version: Mapped[str] = mapped_column(String(32), nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class RolloutStateRecord(WorkflowBase):
    __tablename__ = "rollout_state_records"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_rollout_state_records_idempotency_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    service_name: Mapped[str] = mapped_column(String(64), nullable=False)
    slo_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    alert_severity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    audit_event_id: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scope_key: Mapped[str] = mapped_column(String(96), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    previous_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    intent: Mapped[str] = mapped_column(String(32), nullable=False)
    reason_code: Mapped[str] = mapped_column(String(64), nullable=False)
    reason_detail: Mapped[str] = mapped_column(String(280), nullable=False)
    limited_release_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    schema_version: Mapped[str] = mapped_column(String(32), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
