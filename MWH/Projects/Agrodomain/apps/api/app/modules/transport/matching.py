from __future__ import annotations

from dataclasses import dataclass
from math import ceil

from app.db.models.transport import TransportLoad
from app.db.repositories.identity import ActorSearchMatch
from app.db.repositories.transport import CarrierShipmentStats
from app.modules.transport.routing import CorridorResolver, RouteWaypoint, TransportRouteEstimate


@dataclass(frozen=True, slots=True)
class CarrierMatchCandidate:
    actor_id: str
    display_name: str
    email: str
    availability: str
    availability_reason: str
    score: float
    capacity_tons: float
    vehicle_label: str
    estimated_distance_km: float
    estimated_quote: float
    reliability_score: float
    corridor_fit_score: float
    capacity_fit_score: float
    proximity_score: float
    graph_context_used: bool
    fallback_strategy: str


def _hash_number(input_value: str) -> int:
    total = 0
    for char in input_value:
        total = ((total << 5) - total + ord(char)) & 0xFFFFFFFF
    return total


VEHICLE_LABELS = (
    "Kia Rhino 5t",
    "Hyundai HD72 3.5t",
    "Toyota Dyna 2.5t",
    "Mitsubishi Fuso 7t",
    "Tata 1618 tipper",
)


class TransportMatchEngine:
    def __init__(self, resolver: CorridorResolver | None = None) -> None:
        self.resolver = resolver or CorridorResolver()

    def rank_candidates(
        self,
        *,
        load: TransportLoad,
        route: TransportRouteEstimate,
        carriers: list[ActorSearchMatch],
        carrier_stats: dict[str, CarrierShipmentStats],
        limit: int = 6,
    ) -> list[CarrierMatchCandidate]:
        if not carriers:
            return []

        origin = route.waypoints[0] if route.waypoints else self.resolver.resolve_waypoint(country_code=load.country_code, location=load.origin_location)
        destination = route.waypoints[-1] if route.waypoints else self.resolver.resolve_waypoint(country_code=load.country_code, location=load.destination_location)

        ranked = [
            self._candidate_for_actor(
                actor=actor,
                stats=carrier_stats.get(actor.actor_id),
                load=load,
                route=route,
                origin=origin,
                destination=destination,
            )
            for actor in carriers
            if actor.actor_id != load.poster_actor_id
        ]
        ranked.sort(key=lambda item: (-item.score, item.estimated_quote, item.estimated_distance_km, item.display_name.lower()))
        return ranked[:limit]

    def _candidate_for_actor(
        self,
        *,
        actor: ActorSearchMatch,
        stats: CarrierShipmentStats | None,
        load: TransportLoad,
        route: TransportRouteEstimate,
        origin: RouteWaypoint,
        destination: RouteWaypoint,
    ) -> CarrierMatchCandidate:
        active_shipments = stats.active_shipments if stats is not None else 0
        delivered_shipments = stats.delivered_shipments if stats is not None else 0
        total_shipments = stats.total_shipments if stats is not None else 0
        availability = "busy" if active_shipments > 0 else "available"
        availability_reason = (
            f"{active_shipments} active shipment{'s' if active_shipments != 1 else ''}"
            if active_shipments > 0
            else "No active shipment conflict"
        )

        carrier_seed = _hash_number(actor.actor_id)
        home_hub_index = carrier_seed % max(1, len(route.waypoints))
        home_hub = origin if home_hub_index == 0 else destination
        capacity_tons = round(3 + (carrier_seed % 11) + ((carrier_seed // 101) % 4) * 0.5, 1)
        capacity_fit_score = min(1.0, capacity_tons / max(load.weight_tons, 0.1))
        reliability_score = round(
            min(
                0.96,
                0.62 + (delivered_shipments / max(total_shipments, 1)) * 0.26 + min(total_shipments, 12) * 0.01,
            ),
            2,
        )
        estimated_distance_km = round(8 + abs((carrier_seed % 90) - int(route.distance_km) % 45), 1)
        proximity_score = round(max(0.2, 1 - (estimated_distance_km / 180)), 2)
        corridor_fit_score = round(0.68 if route.provider_mode == "fallback" and not origin.matched else 0.85, 2)
        if home_hub.label in {origin.label, destination.label}:
            corridor_fit_score = min(1.0, corridor_fit_score + 0.12)

        availability_score = 0.55 if availability == "busy" else 1.0
        score = round(
            (
                0.28 * availability_score
                + 0.22 * capacity_fit_score
                + 0.18 * proximity_score
                + 0.18 * corridor_fit_score
                + 0.14 * reliability_score
            )
            * 100,
            1,
        )

        base_quote = route.distance_km * 2.1 + load.weight_tons * 92
        quote_multiplier = 0.92 + ((carrier_seed % 12) / 100) - ((score - 60) / 500)
        estimated_quote = round(max(load.price_offer * 0.72, base_quote * quote_multiplier), 2)
        last_vehicle_info = stats.last_vehicle_info if stats is not None else None
        vehicle_label = self._vehicle_label(actor.actor_id, last_vehicle_info=last_vehicle_info)

        return CarrierMatchCandidate(
            actor_id=actor.actor_id,
            display_name=actor.display_name,
            email=actor.email,
            availability=availability,
            availability_reason=availability_reason,
            score=score,
            capacity_tons=capacity_tons,
            vehicle_label=vehicle_label,
            estimated_distance_km=estimated_distance_km,
            estimated_quote=estimated_quote,
            reliability_score=reliability_score,
            corridor_fit_score=corridor_fit_score,
            capacity_fit_score=round(capacity_fit_score, 2),
            proximity_score=proximity_score,
            graph_context_used=False,
            fallback_strategy="graph_independent_membership_runtime_heuristics",
        )

    def _vehicle_label(self, actor_id: str, *, last_vehicle_info: dict[str, object] | None) -> str:
        if last_vehicle_info:
            vehicle_type = str(last_vehicle_info.get("vehicle_type", "")).strip()
            plate_number = str(last_vehicle_info.get("plate_number", "")).strip()
            if vehicle_type and plate_number:
                return f"{vehicle_type} · {plate_number}"
            if vehicle_type:
                return vehicle_type
            if plate_number:
                return plate_number
        return VEHICLE_LABELS[_hash_number(actor_id) % len(VEHICLE_LABELS)]

    def recommend_vehicle_payload(self, *, actor_id: str, load: TransportLoad) -> dict[str, object]:
        plate_suffix = str(_hash_number(actor_id))[-4:]
        return {
            "vehicle_type": load.vehicle_type_required,
            "plate_number": f"AG-{plate_suffix}",
            "capacity_tons": ceil(load.weight_tons),
        }
