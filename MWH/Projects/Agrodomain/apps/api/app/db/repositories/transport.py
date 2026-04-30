from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.transport import Shipment, ShipmentEvent, TransportLoad


@dataclass(frozen=True, slots=True)
class CarrierShipmentStats:
    actor_id: str
    total_shipments: int
    active_shipments: int
    delivered_shipments: int
    last_vehicle_info: dict[str, object] | None


class TransportRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_load(
        self,
        *,
        load_id: str,
        poster_actor_id: str,
        country_code: str,
        origin_location: str,
        destination_location: str,
        commodity: str,
        weight_tons: float,
        vehicle_type_required: str,
        pickup_date: date,
        delivery_deadline: date,
        price_offer: float,
        price_currency: str,
    ) -> TransportLoad:
        load = TransportLoad(
            load_id=load_id,
            poster_actor_id=poster_actor_id,
            country_code=country_code,
            origin_location=origin_location,
            destination_location=destination_location,
            commodity=commodity,
            weight_tons=weight_tons,
            vehicle_type_required=vehicle_type_required,
            pickup_date=pickup_date,
            delivery_deadline=delivery_deadline,
            price_offer=price_offer,
            price_currency=price_currency,
            status="posted",
        )
        self.session.add(load)
        self.session.flush()
        return load

    def list_loads_for_poster(
        self, *, actor_id: str, country_code: str, status: str | None = None
    ) -> list[TransportLoad]:
        statement = select(TransportLoad).where(
            TransportLoad.poster_actor_id == actor_id,
            TransportLoad.country_code == country_code,
        )
        if status is not None:
            statement = statement.where(TransportLoad.status == status)
        statement = statement.order_by(TransportLoad.created_at.desc(), TransportLoad.id.desc())
        return list(self.session.execute(statement).scalars().all())

    def list_available_loads(self, *, country_code: str, status: str | None = None) -> list[TransportLoad]:
        statement = select(TransportLoad).where(TransportLoad.country_code == country_code)
        if status is not None:
            statement = statement.where(TransportLoad.status == status)
        statement = statement.order_by(TransportLoad.pickup_date.asc(), TransportLoad.id.desc())
        return list(self.session.execute(statement).scalars().all())

    def get_load(self, *, load_id: str, country_code: str) -> TransportLoad | None:
        statement = select(TransportLoad).where(
            TransportLoad.load_id == load_id,
            TransportLoad.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def update_load(
        self,
        *,
        load: TransportLoad,
        status: str,
        assigned_transporter_actor_id: str | None = None,
    ) -> TransportLoad:
        load.status = status
        load.assigned_transporter_actor_id = assigned_transporter_actor_id
        self.session.add(load)
        self.session.flush()
        return load

    def create_shipment(
        self,
        *,
        shipment_id: str,
        load_id: str,
        transporter_actor_id: str,
        country_code: str,
        vehicle_info: dict[str, object],
        current_location_lat: float | None,
        current_location_lng: float | None,
    ) -> Shipment:
        shipment = Shipment(
            shipment_id=shipment_id,
            load_id=load_id,
            transporter_actor_id=transporter_actor_id,
            country_code=country_code,
            vehicle_info=vehicle_info,
            current_location_lat=current_location_lat,
            current_location_lng=current_location_lng,
            status="assigned",
        )
        self.session.add(shipment)
        self.session.flush()
        return shipment

    def get_shipment(self, *, shipment_id: str, country_code: str) -> Shipment | None:
        statement = select(Shipment).where(
            Shipment.shipment_id == shipment_id,
            Shipment.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_shipment_for_load(self, *, load_id: str) -> Shipment | None:
        statement = (
            select(Shipment)
            .where(Shipment.load_id == load_id)
            .order_by(Shipment.created_at.desc(), Shipment.id.desc())
        )
        return self.session.execute(statement).scalars().first()

    def list_shipments_for_loads(self, *, load_ids: list[str]) -> dict[str, Shipment]:
        if not load_ids:
            return {}
        statement = (
            select(Shipment)
            .where(Shipment.load_id.in_(load_ids))
            .order_by(Shipment.load_id.asc(), Shipment.created_at.desc(), Shipment.id.desc())
        )
        items = list(self.session.execute(statement).scalars().all())
        grouped: dict[str, Shipment] = {}
        for item in items:
            grouped.setdefault(item.load_id, item)
        return grouped

    def list_shipments_for_transporter(
        self, *, actor_id: str, country_code: str, status: str | None = None
    ) -> list[Shipment]:
        statement = select(Shipment).where(
            Shipment.transporter_actor_id == actor_id,
            Shipment.country_code == country_code,
        )
        if status is not None:
            statement = statement.where(Shipment.status == status)
        statement = statement.order_by(Shipment.updated_at.desc(), Shipment.id.desc())
        return list(self.session.execute(statement).scalars().all())

    def list_shipments_for_poster(
        self, *, actor_id: str, country_code: str, status: str | None = None
    ) -> list[Shipment]:
        statement = (
            select(Shipment)
            .join(TransportLoad, TransportLoad.load_id == Shipment.load_id)
            .where(
                TransportLoad.poster_actor_id == actor_id,
                TransportLoad.country_code == country_code,
            )
        )
        if status is not None:
            statement = statement.where(Shipment.status == status)
        statement = statement.order_by(Shipment.updated_at.desc(), Shipment.id.desc())
        return list(self.session.execute(statement).scalars().all())

    def list_shipments_for_country(self, *, country_code: str, status: str | None = None) -> list[Shipment]:
        statement = select(Shipment).where(Shipment.country_code == country_code)
        if status is not None:
            statement = statement.where(Shipment.status == status)
        statement = statement.order_by(Shipment.updated_at.desc(), Shipment.id.desc())
        return list(self.session.execute(statement).scalars().all())

    def update_shipment(
        self,
        *,
        shipment: Shipment,
        status: str,
        transporter_actor_id: str | None = None,
        pickup_time: datetime | None = None,
        delivery_time: datetime | None = None,
        current_location_lat: float | None = None,
        current_location_lng: float | None = None,
        proof_of_delivery_url: str | None = None,
    ) -> Shipment:
        shipment.status = status
        if transporter_actor_id is not None:
            shipment.transporter_actor_id = transporter_actor_id
        if pickup_time is not None:
            shipment.pickup_time = pickup_time
        if delivery_time is not None:
            shipment.delivery_time = delivery_time
        if current_location_lat is not None:
            shipment.current_location_lat = current_location_lat
        if current_location_lng is not None:
            shipment.current_location_lng = current_location_lng
        if proof_of_delivery_url is not None:
            shipment.proof_of_delivery_url = proof_of_delivery_url
        self.session.add(shipment)
        self.session.flush()
        return shipment

    def create_shipment_event(
        self,
        *,
        event_id: str,
        shipment_id: str,
        actor_id: str,
        event_type: str,
        event_at: datetime | None,
        location_lat: float | None,
        location_lng: float | None,
        notes: str | None,
    ) -> ShipmentEvent:
        timestamp = event_at or datetime.now(tz=UTC)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        event = ShipmentEvent(
            event_id=event_id,
            shipment_id=shipment_id,
            actor_id=actor_id,
            event_type=event_type,
            event_at=timestamp,
            location_lat=location_lat,
            location_lng=location_lng,
            notes=notes,
        )
        self.session.add(event)
        self.session.flush()
        return event

    def list_shipment_events(self, *, shipment_id: str) -> list[ShipmentEvent]:
        statement = (
            select(ShipmentEvent)
            .where(ShipmentEvent.shipment_id == shipment_id)
            .order_by(ShipmentEvent.event_at.asc(), ShipmentEvent.id.asc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_carrier_stats(
        self,
        *,
        country_code: str,
        actor_ids: list[str] | None = None,
    ) -> dict[str, CarrierShipmentStats]:
        statement = select(Shipment).where(Shipment.country_code == country_code).order_by(
            Shipment.updated_at.desc(), Shipment.id.desc()
        )
        if actor_ids is not None:
            if not actor_ids:
                return {}
            statement = statement.where(Shipment.transporter_actor_id.in_(actor_ids))

        grouped: dict[str, dict[str, Any]] = {}
        for shipment in self.session.execute(statement).scalars().all():
            bucket = grouped.setdefault(
                shipment.transporter_actor_id,
                {
                    "actor_id": shipment.transporter_actor_id,
                    "total_shipments": 0,
                    "active_shipments": 0,
                    "delivered_shipments": 0,
                    "last_vehicle_info": None,
                },
            )
            bucket["total_shipments"] = int(bucket["total_shipments"]) + 1
            if shipment.status in {"assigned", "in_transit"}:
                bucket["active_shipments"] = int(bucket["active_shipments"]) + 1
            if shipment.status == "delivered":
                bucket["delivered_shipments"] = int(bucket["delivered_shipments"]) + 1
            if bucket["last_vehicle_info"] is None and shipment.vehicle_info:
                bucket["last_vehicle_info"] = shipment.vehicle_info

        return {
            actor_id: CarrierShipmentStats(
                actor_id=actor_id,
                total_shipments=int(payload["total_shipments"]),
                active_shipments=int(payload["active_shipments"]),
                delivered_shipments=int(payload["delivered_shipments"]),
                last_vehicle_info=payload["last_vehicle_info"] if isinstance(payload["last_vehicle_info"], dict) else None,
            )
            for actor_id, payload in grouped.items()
        }
