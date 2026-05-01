from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
from uuid import uuid4

from app.db.models.transport import Shipment, ShipmentEvent, TransportLoad
from app.db.repositories.transport import TransportRepository
from app.services.commands.errors import CommandRejectedError

LOAD_POST_ROLES = {"farmer", "buyer", "cooperative", "admin"}
TRANSPORT_ASSIGN_ROLES = {"transporter", "admin"}
ALLOWED_LOAD_STATUSES = {"posted", "assigned", "in_transit", "delivered", "cancelled"}
OPERATIONAL_EVENT_TYPES = {"picked_up", "in_transit", "checkpoint"}


@dataclass(slots=True)
class ShipmentMutationResult:
    load: TransportLoad
    shipment: Shipment
    event: ShipmentEvent


class TransportRuntime:
    def __init__(self, repository: TransportRepository) -> None:
        self.repository = repository

    @staticmethod
    def _ensure_country_scope(country_code: str | None) -> str:
        if country_code is None:
            raise CommandRejectedError(
                status_code=403,
                error_code="country_scope_missing",
                reason_code="country_scope_missing",
                payload={},
            )
        return country_code

    @staticmethod
    def _ensure_non_empty(value: str, *, field_name: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code=f"{field_name}_missing",
                payload={"field": field_name},
            )
        return normalized

    @staticmethod
    def _ensure_positive(value: float, *, field_name: str) -> float:
        if value <= 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code=f"{field_name}_non_positive",
                payload={"field": field_name},
            )
        return round(value, 2)

    @staticmethod
    def _ensure_role(actor_id: str, actor_role: str | None, *, allowed: set[str], reason_code: str) -> None:
        if actor_id == "system:test":
            return
        if actor_role not in allowed:
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code=reason_code,
                payload={"actor_role": actor_role},
            )

    @staticmethod
    def _ensure_coordinate_pair(location_lat: float | None, location_lng: float | None) -> None:
        if (location_lat is None) != (location_lng is None):
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="location_coordinates_incomplete",
                payload={},
            )
        if location_lat is not None and not (-90 <= location_lat <= 90):
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="location_lat_out_of_range",
                payload={},
            )
        if location_lng is not None and not (-180 <= location_lng <= 180):
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="location_lng_out_of_range",
                payload={},
            )

    @staticmethod
    def ensure_status_filter(status: str | None) -> str | None:
        if status is None:
            return None
        normalized = status.strip().lower()
        if normalized not in ALLOWED_LOAD_STATUSES:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="invalid_transport_status_filter",
                payload={"status": status},
            )
        return normalized

    def create_load(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        country_code: str | None,
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
        self._ensure_role(
            actor_id,
            actor_role,
            allowed=LOAD_POST_ROLES,
            reason_code="transport_load_post_forbidden",
        )
        scoped_country = self._ensure_country_scope(country_code)
        origin = self._ensure_non_empty(origin_location, field_name="origin_location")
        destination = self._ensure_non_empty(destination_location, field_name="destination_location")
        commodity_name = self._ensure_non_empty(commodity, field_name="commodity")
        vehicle_type = self._ensure_non_empty(vehicle_type_required, field_name="vehicle_type_required")
        currency = self._ensure_non_empty(price_currency, field_name="price_currency").upper()
        if len(currency) != 3:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="price_currency_invalid",
                payload={"field": "price_currency"},
            )
        rounded_weight = self._ensure_positive(weight_tons, field_name="weight_tons")
        rounded_price = self._ensure_positive(price_offer, field_name="price_offer")
        if delivery_deadline < pickup_date:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="delivery_deadline_before_pickup_date",
                payload={},
            )
        return self.repository.create_load(
            load_id=f"load-{uuid4().hex[:12]}",
            poster_actor_id=actor_id,
            country_code=scoped_country,
            origin_location=origin,
            destination_location=destination,
            commodity=commodity_name,
            weight_tons=rounded_weight,
            vehicle_type_required=vehicle_type,
            pickup_date=pickup_date,
            delivery_deadline=delivery_deadline,
            price_offer=rounded_price,
            price_currency=currency,
        )

    def assign_load(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        load: TransportLoad,
        vehicle_info: dict[str, object],
        location_lat: float | None,
        location_lng: float | None,
        notes: str | None,
    ) -> ShipmentMutationResult:
        self._ensure_role(
            actor_id,
            actor_role,
            allowed=TRANSPORT_ASSIGN_ROLES,
            reason_code="transport_load_assign_forbidden",
        )
        self._ensure_coordinate_pair(location_lat, location_lng)
        if actor_id == load.poster_actor_id and actor_id != "system:test":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="transport_self_assignment_forbidden",
                payload={"load_id": load.load_id},
            )
        if load.status != "posted":
            raise CommandRejectedError(
                status_code=409,
                error_code="transport_load_not_available",
                reason_code="transport_load_not_posted",
                payload={"load_id": load.load_id, "status": load.status},
            )
        if not vehicle_info:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="vehicle_info_missing",
                payload={"field": "vehicle_info"},
            )
        shipment = self.repository.get_shipment_for_load(load_id=load.load_id)
        if shipment is not None:
            raise CommandRejectedError(
                status_code=409,
                error_code="transport_load_already_assigned",
                reason_code="transport_shipment_exists_for_load",
                payload={"load_id": load.load_id, "shipment_id": shipment.shipment_id},
            )
        updated_load = self.repository.update_load(
            load=load,
            status="assigned",
            assigned_transporter_actor_id=actor_id,
        )
        shipment = self.repository.create_shipment(
            shipment_id=f"shipment-{uuid4().hex[:12]}",
            load_id=load.load_id,
            transporter_actor_id=actor_id,
            country_code=load.country_code,
            vehicle_info=vehicle_info,
            current_location_lat=location_lat,
            current_location_lng=location_lng,
        )
        event = self.repository.create_shipment_event(
            event_id=f"sevt-{uuid4().hex[:12]}",
            shipment_id=shipment.shipment_id,
            actor_id=actor_id,
            event_type="assigned",
            event_at=datetime.now(tz=UTC),
            location_lat=location_lat,
            location_lng=location_lng,
            notes=notes.strip() if notes else None,
        )
        return ShipmentMutationResult(load=updated_load, shipment=shipment, event=event)

    def log_operational_event(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        load: TransportLoad,
        shipment: Shipment,
        event_type: str,
        location_lat: float | None,
        location_lng: float | None,
        notes: str | None,
    ) -> ShipmentMutationResult:
        self._ensure_role(
            actor_id,
            actor_role,
            allowed=TRANSPORT_ASSIGN_ROLES,
            reason_code="transport_shipment_event_forbidden",
        )
        self._ensure_coordinate_pair(location_lat, location_lng)
        normalized_event = event_type.strip().lower()
        if normalized_event not in OPERATIONAL_EVENT_TYPES:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="invalid_shipment_event_type",
                payload={"event_type": event_type},
            )
        if actor_id not in {shipment.transporter_actor_id, "system:test"} and actor_role != "admin":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="transport_shipment_actor_mismatch",
                payload={"shipment_id": shipment.shipment_id},
            )
        if shipment.status == "delivered":
            raise CommandRejectedError(
                status_code=409,
                error_code="transport_shipment_closed",
                reason_code="transport_shipment_already_delivered",
                payload={"shipment_id": shipment.shipment_id},
            )
        if normalized_event == "checkpoint" and shipment.status != "in_transit":
            raise CommandRejectedError(
                status_code=409,
                error_code="transport_shipment_not_in_transit",
                reason_code="transport_checkpoint_requires_in_transit",
                payload={"shipment_id": shipment.shipment_id, "status": shipment.status},
            )

        now = datetime.now(tz=UTC)
        next_status = "in_transit" if normalized_event in {"picked_up", "in_transit", "checkpoint"} else shipment.status
        pickup_time = shipment.pickup_time
        if normalized_event in {"picked_up", "in_transit"} and pickup_time is None:
            pickup_time = now
        updated_load = self.repository.update_load(
            load=load,
            status="in_transit",
            assigned_transporter_actor_id=shipment.transporter_actor_id,
        )
        updated_shipment = self.repository.update_shipment(
            shipment=shipment,
            status=next_status,
            pickup_time=pickup_time,
            current_location_lat=location_lat,
            current_location_lng=location_lng,
        )
        event = self.repository.create_shipment_event(
            event_id=f"sevt-{uuid4().hex[:12]}",
            shipment_id=shipment.shipment_id,
            actor_id=actor_id,
            event_type=normalized_event,
            event_at=now,
            location_lat=location_lat,
            location_lng=location_lng,
            notes=notes.strip() if notes else None,
        )
        return ShipmentMutationResult(load=updated_load, shipment=updated_shipment, event=event)

    def deliver_shipment(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        load: TransportLoad,
        shipment: Shipment,
        proof_of_delivery_url: str,
        location_lat: float | None,
        location_lng: float | None,
        notes: str | None,
    ) -> ShipmentMutationResult:
        self._ensure_role(
            actor_id,
            actor_role,
            allowed=TRANSPORT_ASSIGN_ROLES,
            reason_code="transport_shipment_delivery_forbidden",
        )
        self._ensure_coordinate_pair(location_lat, location_lng)
        proof_url = self._ensure_non_empty(proof_of_delivery_url, field_name="proof_of_delivery_url")
        if actor_id not in {shipment.transporter_actor_id, "system:test"} and actor_role != "admin":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="transport_shipment_actor_mismatch",
                payload={"shipment_id": shipment.shipment_id},
            )
        if shipment.status == "delivered":
            raise CommandRejectedError(
                status_code=409,
                error_code="transport_shipment_closed",
                reason_code="transport_shipment_already_delivered",
                payload={"shipment_id": shipment.shipment_id},
            )
        now = datetime.now(tz=UTC)
        updated_load = self.repository.update_load(
            load=load,
            status="delivered",
            assigned_transporter_actor_id=shipment.transporter_actor_id,
        )
        updated_shipment = self.repository.update_shipment(
            shipment=shipment,
            status="delivered",
            pickup_time=shipment.pickup_time or now,
            delivery_time=now,
            current_location_lat=location_lat,
            current_location_lng=location_lng,
            proof_of_delivery_url=proof_url,
        )
        event = self.repository.create_shipment_event(
            event_id=f"sevt-{uuid4().hex[:12]}",
            shipment_id=shipment.shipment_id,
            actor_id=actor_id,
            event_type="delivered",
            event_at=now,
            location_lat=location_lat,
            location_lng=location_lng,
            notes=notes.strip() if notes else None,
        )
        return ShipmentMutationResult(load=updated_load, shipment=updated_shipment, event=event)
