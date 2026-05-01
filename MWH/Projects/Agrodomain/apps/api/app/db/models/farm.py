from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class FarmField(WorkflowBase):
    __tablename__ = "farm_fields"
    __table_args__ = (
        UniqueConstraint("field_id", name="uq_farm_fields_field_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    field_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_profiles.farm_id"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    boundary_geojson: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    area_hectares: Mapped[float] = mapped_column(Float(), nullable=False)
    soil_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    irrigation_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_crop: Mapped[str | None] = mapped_column(String(64), nullable=True)
    planting_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    expected_harvest_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class FarmActivity(WorkflowBase):
    __tablename__ = "farm_activities"
    __table_args__ = (
        UniqueConstraint("activity_id", name="uq_farm_activities_activity_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_profiles.farm_id"), nullable=False
    )
    field_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_fields.field_id"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    activity_date: Mapped[date] = mapped_column(Date(), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    inputs_used: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    labor_hours: Mapped[float | None] = mapped_column(Float(), nullable=True)
    cost: Mapped[float | None] = mapped_column(Float(), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(600), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class FarmInput(WorkflowBase):
    __tablename__ = "farm_inputs"
    __table_args__ = (
        UniqueConstraint("input_id", name="uq_farm_inputs_input_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    input_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_profiles.farm_id"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    input_type: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[float] = mapped_column(Float(), nullable=False)
    unit: Mapped[str] = mapped_column(String(24), nullable=False)
    cost: Mapped[float | None] = mapped_column(Float(), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(160), nullable=True)
    purchase_date: Mapped[date] = mapped_column(Date(), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CropCycle(WorkflowBase):
    __tablename__ = "crop_cycles"
    __table_args__ = (
        UniqueConstraint("crop_cycle_id", name="uq_crop_cycles_crop_cycle_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    crop_cycle_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_profiles.farm_id"), nullable=False
    )
    field_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("farm_fields.field_id"), nullable=False
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    crop_type: Mapped[str] = mapped_column(String(64), nullable=False)
    variety: Mapped[str | None] = mapped_column(String(120), nullable=True)
    planting_date: Mapped[date] = mapped_column(Date(), nullable=False)
    harvest_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    yield_tons: Mapped[float | None] = mapped_column(Float(), nullable=True)
    revenue: Mapped[float | None] = mapped_column(Float(), nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="planned")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
