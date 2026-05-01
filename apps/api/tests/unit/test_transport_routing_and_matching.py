from datetime import UTC, date, datetime

from app.db.repositories.identity import ActorSearchMatch
from app.db.repositories.transport import CarrierShipmentStats
from app.modules.transport.matching import TransportMatchEngine
from app.modules.transport.routing import FallbackRouteProvider, HybridRouteProvider, TransportRoutingError
from app.modules.transport.routing import CorridorResolver
from app.modules.transport.routing import TransportRouteEstimate
from app.db.models.transport import TransportLoad


class BrokenPrimaryProvider:
    provider_name = "mapbox"

    def estimate_route(self, **kwargs) -> TransportRouteEstimate:
        raise TransportRoutingError("mapbox_token_missing", "missing token")


def test_fallback_route_provider_returns_corridor_estimate() -> None:
    provider = FallbackRouteProvider(CorridorResolver())

    route = provider.estimate_route(
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Accra, GH",
        pickup_date=date(2026, 4, 30),
        requested_at=datetime(2026, 4, 29, 8, 0, tzinfo=UTC),
    )

    assert route.provider == "fallback"
    assert route.provider_mode == "fallback"
    assert route.distance_km > 0
    assert route.duration_minutes >= 45
    assert route.corridor_code.startswith("gh:")
    assert route.waypoints[0].matched is True
    assert route.waypoints[1].matched is True


def test_hybrid_provider_falls_back_when_primary_unavailable() -> None:
    provider = HybridRouteProvider(
        primary=BrokenPrimaryProvider(),
        fallback=FallbackRouteProvider(CorridorResolver()),
    )

    route = provider.estimate_route(
        country_code="NG",
        origin_location="Kano",
        destination_location="Lagos",
        pickup_date=date(2026, 5, 1),
        requested_at=datetime(2026, 4, 29, 8, 0, tzinfo=UTC),
    )

    assert route.provider_mode == "fallback"
    assert "mapbox_token_missing" in route.degraded_reasons


def test_match_engine_uses_graph_independent_runtime_signals() -> None:
    load = TransportLoad(
        load_id="load-123",
        poster_actor_id="actor-farmer-gh-ama",
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Accra, GH",
        commodity="Cassava",
        weight_tons=6.0,
        vehicle_type_required="flatbed",
        pickup_date=date(2026, 4, 30),
        delivery_deadline=date(2026, 5, 1),
        price_offer=900,
        price_currency="GHS",
        status="posted",
        assigned_transporter_actor_id=None,
    )
    route = FallbackRouteProvider(CorridorResolver()).estimate_route(
        country_code="GH",
        origin_location=load.origin_location,
        destination_location=load.destination_location,
        pickup_date=load.pickup_date,
        requested_at=datetime(2026, 4, 29, 8, 0, tzinfo=UTC),
    )
    carriers = [
        ActorSearchMatch(
            actor_id="actor-transporter-gh-busy",
            display_name="Busy Carrier",
            email="busy@example.com",
            role="transporter",
            country_code="GH",
            organization_name="Ghana Growers Network",
        ),
        ActorSearchMatch(
            actor_id="actor-transporter-gh-ready",
            display_name="Ready Carrier",
            email="ready@example.com",
            role="transporter",
            country_code="GH",
            organization_name="Ghana Growers Network",
        ),
    ]
    stats = {
        "actor-transporter-gh-busy": CarrierShipmentStats(
            actor_id="actor-transporter-gh-busy",
            total_shipments=5,
            active_shipments=1,
            delivered_shipments=4,
            last_vehicle_info={"vehicle_type": "flatbed", "plate_number": "GT-1000"},
        ),
        "actor-transporter-gh-ready": CarrierShipmentStats(
            actor_id="actor-transporter-gh-ready",
            total_shipments=3,
            active_shipments=0,
            delivered_shipments=3,
            last_vehicle_info={"vehicle_type": "flatbed", "plate_number": "GT-2000"},
        ),
    }

    ranked = TransportMatchEngine().rank_candidates(
        load=load,
        route=route,
        carriers=carriers,
        carrier_stats=stats,
    )

    assert ranked[0].actor_id == "actor-transporter-gh-ready"
    assert ranked[0].graph_context_used is False
    assert ranked[0].fallback_strategy == "graph_independent_membership_runtime_heuristics"
