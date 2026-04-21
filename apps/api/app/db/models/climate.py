from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class FarmProfile(WorkflowBase):
    __tablename__ = "farm_profiles"
    __table_args__ = (
        UniqueConstraint("farm_id", name="uq_farm_profiles_farm_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    farm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    farm_name: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    crop_type: Mapped[str] = mapped_column(String(64), nullable=False)
    hectares: Mapped[float] = mapped_column(Float(), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float(), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float(), nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ClimateObservation(WorkflowBase):
    __tablename__ = "climate_observations"
    __table_args__ = (
        UniqueConstraint("observation_id", name="uq_climate_observations_observation_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    observation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rainfall_mm: Mapped[float | None] = mapped_column(Float(), nullable=True)
    temperature_c: Mapped[float | None] = mapped_column(Float(), nullable=True)
    soil_moisture_pct: Mapped[float | None] = mapped_column(Float(), nullable=True)
    anomaly_score: Mapped[float | None] = mapped_column(Float(), nullable=True)
    ingestion_state: Mapped[str] = mapped_column(String(32), nullable=False)
    degraded_mode: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    degraded_reason_codes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    assumptions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    normalized_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ClimateAlert(WorkflowBase):
    __tablename__ = "climate_alerts"
    __table_args__ = (
        UniqueConstraint("alert_id", name="uq_climate_alerts_alert_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    alert_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    observation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    alert_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    precedence_rank: Mapped[int] = mapped_column(Integer(), nullable=False)
    headline: Mapped[str] = mapped_column(String(160), nullable=False)
    detail: Mapped[str] = mapped_column(String(600), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="open")
    source_confidence: Mapped[str] = mapped_column(String(24), nullable=False)
    degraded_mode: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    degraded_reason_codes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    farm_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    acknowledgement_note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class MrvEvidenceRecord(WorkflowBase):
    __tablename__ = "mrv_evidence_records"
    __table_args__ = (
        UniqueConstraint("evidence_id", name="uq_mrv_evidence_records_evidence_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    evidence_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)
    method_tag: Mapped[str] = mapped_column(String(64), nullable=False)
    method_references: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    source_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_observation_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    alert_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    assumptions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    source_completeness_state: Mapped[str] = mapped_column(String(32), nullable=False)
    degraded_mode: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    degraded_reason_codes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    summary: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
