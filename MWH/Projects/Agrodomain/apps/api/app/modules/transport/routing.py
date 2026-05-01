from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
import json
from math import asin, cos, radians, sin, sqrt
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import Settings


class TransportRoutingError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


@dataclass(frozen=True, slots=True)
class RouteWaypoint:
    label: str
    latitude: float
    longitude: float
    matched: bool


@dataclass(frozen=True, slots=True)
class TransportRouteEstimate:
    provider: str
    provider_mode: str
    distance_km: float
    duration_minutes: int
    eta_at: str
    corridor_code: str
    waypoints: list[RouteWaypoint]
    geometry: list[dict[str, float]]
    degraded_reasons: list[str]


class TransportRouteProvider(Protocol):
    provider_name: str

    def estimate_route(
        self,
        *,
        country_code: str,
        origin_location: str,
        destination_location: str,
        pickup_date: date,
        requested_at: datetime | None = None,
    ) -> TransportRouteEstimate: ...


@dataclass(frozen=True, slots=True)
class CorridorHub:
    label: str
    aliases: tuple[str, ...]
    latitude: float
    longitude: float


COUNTRY_HUBS: dict[str, tuple[CorridorHub, ...]] = {
    "GH": (
        CorridorHub("Accra", ("accra",), 5.6037, -0.1870),
        CorridorHub("Tema", ("tema",), 5.6698, -0.0166),
        CorridorHub("Kumasi", ("kumasi",), 6.6885, -1.6244),
        CorridorHub("Techiman", ("techiman",), 7.5904, -1.9395),
        CorridorHub("Tamale", ("tamale",), 9.4075, -0.8533),
        CorridorHub("Bolgatanga", ("bolgatanga",), 10.7867, -0.8517),
    ),
    "NG": (
        CorridorHub("Lagos", ("lagos",), 6.5244, 3.3792),
        CorridorHub("Ibadan", ("ibadan",), 7.3775, 3.9470),
        CorridorHub("Abuja", ("abuja",), 9.0765, 7.3986),
        CorridorHub("Kaduna", ("kaduna",), 10.5105, 7.4165),
        CorridorHub("Kano", ("kano",), 12.0022, 8.5920),
        CorridorHub("Port Harcourt", ("port harcourt", "ph"), 4.8156, 7.0498),
    ),
}

COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "GH": (7.9465, -1.0232),
    "NG": (9.0820, 8.6753),
}

AVERAGE_SPEED_KPH: dict[str, int] = {
    "GH": 58,
    "NG": 54,
}


def _hash_number(input_value: str) -> int:
    total = 0
    for char in input_value:
        total = ((total << 5) - total + ord(char)) & 0xFFFFFFFF
    return total


def _normalized_location(value: str) -> str:
    return value.strip().lower()


def _point_payload(latitude: float, longitude: float) -> dict[str, float]:
    return {"latitude": round(latitude, 5), "longitude": round(longitude, 5)}


def _haversine_km(first: RouteWaypoint, second: RouteWaypoint) -> float:
    latitude_delta = radians(second.latitude - first.latitude)
    longitude_delta = radians(second.longitude - first.longitude)
    left = sin(latitude_delta / 2) ** 2 + cos(radians(first.latitude)) * cos(radians(second.latitude)) * sin(
        longitude_delta / 2
    ) ** 2
    return 6371.0 * 2 * asin(sqrt(left))


def _departure_time(*, pickup_date: date, requested_at: datetime | None = None) -> datetime:
    baseline = requested_at or datetime.now(tz=UTC)
    if baseline.tzinfo is None:
        baseline = baseline.replace(tzinfo=UTC)
    earliest_pickup = datetime.combine(pickup_date, time(hour=6, minute=0), tzinfo=UTC)
    return max(baseline, earliest_pickup)


class CorridorResolver:
    def resolve_waypoint(self, *, country_code: str, location: str) -> RouteWaypoint:
        normalized = _normalized_location(location)
        hubs = COUNTRY_HUBS.get(country_code, ())
        for hub in hubs:
            if any(alias in normalized for alias in hub.aliases):
                return RouteWaypoint(
                    label=hub.label,
                    latitude=hub.latitude,
                    longitude=hub.longitude,
                    matched=True,
                )

        centroid_latitude, centroid_longitude = COUNTRY_CENTROIDS.get(country_code, (0.0, 0.0))
        offset_seed = _hash_number(f"{country_code}:{normalized}")
        latitude_offset = ((offset_seed % 1400) / 1000) - 0.7
        longitude_offset = (((offset_seed // 1400) % 1400) / 1000) - 0.7
        return RouteWaypoint(
            label=location.strip() or "Unspecified corridor point",
            latitude=round(centroid_latitude + latitude_offset, 5),
            longitude=round(centroid_longitude + longitude_offset, 5),
            matched=False,
        )

    def corridor_code(self, *, country_code: str, origin: RouteWaypoint, destination: RouteWaypoint) -> str:
        return f"{country_code.lower()}:{origin.label.lower().replace(' ', '-')}-{destination.label.lower().replace(' ', '-')}"


class _UrlJsonFetcher:
    def __init__(self, *, timeout_seconds: int) -> None:
        self.timeout_seconds = timeout_seconds

    def get(self, url: str) -> dict[str, Any]:
        request = Request(url=url, method="GET")
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise TransportRoutingError("provider_http_error", detail or str(exc)) from exc
        except URLError as exc:
            raise TransportRoutingError("provider_network_error", str(exc.reason)) from exc


class FallbackRouteProvider:
    provider_name = "fallback"

    def __init__(self, resolver: CorridorResolver) -> None:
        self.resolver = resolver

    def estimate_route(
        self,
        *,
        country_code: str,
        origin_location: str,
        destination_location: str,
        pickup_date: date,
        requested_at: datetime | None = None,
    ) -> TransportRouteEstimate:
        origin = self.resolver.resolve_waypoint(country_code=country_code, location=origin_location)
        destination = self.resolver.resolve_waypoint(country_code=country_code, location=destination_location)
        straight_line = _haversine_km(origin, destination)
        if straight_line <= 0:
            straight_line = 40 + (_hash_number(f"{country_code}:{origin.label}:{destination.label}") % 120)
        distance_km = round(max(35.0, straight_line * 1.18), 1)
        speed = AVERAGE_SPEED_KPH.get(country_code, 52)
        duration_minutes = max(45, int(round((distance_km / max(speed, 1)) * 60 + 35)))
        eta_at = (_departure_time(pickup_date=pickup_date, requested_at=requested_at) + timedelta(minutes=duration_minutes)).isoformat().replace("+00:00", "Z")
        degraded_reasons = []
        if not origin.matched or not destination.matched:
            degraded_reasons.append("corridor_geocode_fallback")
        return TransportRouteEstimate(
            provider=self.provider_name,
            provider_mode="fallback",
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            eta_at=eta_at,
            corridor_code=self.resolver.corridor_code(country_code=country_code, origin=origin, destination=destination),
            waypoints=[origin, destination],
            geometry=[
                _point_payload(origin.latitude, origin.longitude),
                _point_payload(destination.latitude, destination.longitude),
            ],
            degraded_reasons=degraded_reasons or ["mapbox_unavailable"],
        )


class MapboxRouteProvider:
    provider_name = "mapbox"

    def __init__(
        self,
        *,
        access_token: str,
        base_url: str,
        timeout_seconds: int,
        resolver: CorridorResolver,
        fetcher: _UrlJsonFetcher | None = None,
    ) -> None:
        self.access_token = access_token.strip()
        self.base_url = base_url.rstrip("/")
        self.fetcher = fetcher or _UrlJsonFetcher(timeout_seconds=timeout_seconds)
        self.resolver = resolver

    def estimate_route(
        self,
        *,
        country_code: str,
        origin_location: str,
        destination_location: str,
        pickup_date: date,
        requested_at: datetime | None = None,
    ) -> TransportRouteEstimate:
        if not self.access_token:
            raise TransportRoutingError("mapbox_token_missing", "Mapbox access token is not configured.")

        origin = self.resolver.resolve_waypoint(country_code=country_code, location=origin_location)
        destination = self.resolver.resolve_waypoint(country_code=country_code, location=destination_location)
        if not origin.matched or not destination.matched:
            raise TransportRoutingError("corridor_not_supported", "Priority corridor coordinates are unavailable for this route.")

        coordinates = f"{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}"
        query = urlencode(
            {
                "access_token": self.access_token,
                "alternatives": "false",
                "annotations": "distance,duration",
                "geometries": "geojson",
                "overview": "full",
                "steps": "false",
            }
        )
        payload = self.fetcher.get(f"{self.base_url}/{coordinates}?{query}")
        routes = payload.get("routes")
        if not isinstance(routes, list) or not routes:
            raise TransportRoutingError("provider_invalid_payload", "Mapbox response is missing routes.")

        route = routes[0]
        distance_km = round(float(route.get("distance", 0.0)) / 1000, 1)
        duration_minutes = max(1, int(round(float(route.get("duration", 0.0)) / 60)))
        geometry = route.get("geometry", {})
        coordinates_payload = geometry.get("coordinates") if isinstance(geometry, dict) else None
        if not isinstance(coordinates_payload, list) or not coordinates_payload:
            coordinates_payload = [
                [origin.longitude, origin.latitude],
                [destination.longitude, destination.latitude],
            ]
        eta_at = (_departure_time(pickup_date=pickup_date, requested_at=requested_at) + timedelta(minutes=duration_minutes)).isoformat().replace("+00:00", "Z")
        return TransportRouteEstimate(
            provider=self.provider_name,
            provider_mode="live",
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            eta_at=eta_at,
            corridor_code=self.resolver.corridor_code(country_code=country_code, origin=origin, destination=destination),
            waypoints=[origin, destination],
            geometry=[
                _point_payload(float(item[1]), float(item[0]))
                for item in coordinates_payload
                if isinstance(item, list) and len(item) >= 2
            ],
            degraded_reasons=[],
        )


class HybridRouteProvider:
    provider_name = "hybrid"

    def __init__(self, *, primary: TransportRouteProvider | None, fallback: TransportRouteProvider) -> None:
        self.primary = primary
        self.fallback = fallback

    def estimate_route(
        self,
        *,
        country_code: str,
        origin_location: str,
        destination_location: str,
        pickup_date: date,
        requested_at: datetime | None = None,
    ) -> TransportRouteEstimate:
        if self.primary is None:
            return self.fallback.estimate_route(
                country_code=country_code,
                origin_location=origin_location,
                destination_location=destination_location,
                pickup_date=pickup_date,
                requested_at=requested_at,
            )

        try:
            return self.primary.estimate_route(
                country_code=country_code,
                origin_location=origin_location,
                destination_location=destination_location,
                pickup_date=pickup_date,
                requested_at=requested_at,
            )
        except TransportRoutingError as exc:
            fallback_estimate = self.fallback.estimate_route(
                country_code=country_code,
                origin_location=origin_location,
                destination_location=destination_location,
                pickup_date=pickup_date,
                requested_at=requested_at,
            )
            return TransportRouteEstimate(
                provider=fallback_estimate.provider,
                provider_mode=fallback_estimate.provider_mode,
                distance_km=fallback_estimate.distance_km,
                duration_minutes=fallback_estimate.duration_minutes,
                eta_at=fallback_estimate.eta_at,
                corridor_code=fallback_estimate.corridor_code,
                waypoints=fallback_estimate.waypoints,
                geometry=fallback_estimate.geometry,
                degraded_reasons=[exc.code, *fallback_estimate.degraded_reasons],
            )


def build_transport_route_provider(settings: Settings) -> TransportRouteProvider:
    resolver = CorridorResolver()
    fallback = FallbackRouteProvider(resolver)
    if settings.mapbox_access_token:
        primary: TransportRouteProvider | None = MapboxRouteProvider(
            access_token=settings.mapbox_access_token,
            base_url=settings.mapbox_directions_base_url,
            timeout_seconds=settings.routing_request_timeout_seconds,
            resolver=resolver,
        )
    else:
        primary = None
    return HybridRouteProvider(primary=primary, fallback=fallback)
