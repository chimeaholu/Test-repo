from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import CommerceBase


class TransportLoad(CommerceBase):
    __tablename__ = "transport_loads"
    __table_args__ = (UniqueConstraint("load_id", name="uq_transport_loads_load_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    load_id: Mapped[str] = mapped_column(String(64), nullable=False)
    poster_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    origin_location: Mapped[str] = mapped_column(String(160), nullable=False)
    destination_location: Mapped[str] = mapped_column(String(160), nullable=False)
    commodity: Mapped[str] = mapped_column(String(64), nullable=False)
    weight_tons: Mapped[float] = mapped_column(Float(), nullable=False)
    vehicle_type_required: Mapped[str] = mapped_column(String(64), nullable=False)
    pickup_date: Mapped[date] = mapped_column(Date(), nullable=False)
    delivery_deadline: Mapped[date] = mapped_column(Date(), nullable=False)
    price_offer: Mapped[float] = mapped_column(Float(), nullable=False)
    price_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="posted")
    assigned_transporter_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Shipment(CommerceBase):
    __tablename__ = "transport_shipments"
    __table_args__ = (UniqueConstraint("shipment_id", name="uq_transport_shipments_shipment_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    shipment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    load_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("transport_loads.load_id"),
        nullable=False,
    )
    transporter_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    vehicle_info: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    pickup_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_location_lat: Mapped[float | None] = mapped_column(Float(), nullable=True)
    current_location_lng: Mapped[float | None] = mapped_column(Float(), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="assigned")
    proof_of_delivery_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ShipmentEvent(CommerceBase):
    __tablename__ = "transport_shipment_events"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_transport_shipment_events_event_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    shipment_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("transport_shipments.shipment_id"),
        nullable=False,
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    event_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    location_lat: Mapped[float | None] = mapped_column(Float(), nullable=True)
    location_lng: Mapped[float | None] = mapped_column(Float(), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
