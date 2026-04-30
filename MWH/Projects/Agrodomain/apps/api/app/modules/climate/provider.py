from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import json
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import Settings


class WeatherProviderError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


@dataclass(frozen=True, slots=True)
class WeatherDay:
    date: str
    temperature_max_c: float | None
    temperature_min_c: float | None
    precipitation_mm: float | None
    precipitation_probability_pct: float | None
    evapotranspiration_mm: float | None
    weather_code: int | None


@dataclass(frozen=True, slots=True)
class WeatherDataset:
    kind: str
    provider: str
    provider_mode: str
    latitude: float | None
    longitude: float | None
    timezone: str | None
    generated_at: str
    degraded_mode: bool
    degraded_reasons: list[str]
    days: list[WeatherDay]
    source_window_start: str | None = None
    source_window_end: str | None = None


class WeatherProvider(Protocol):
    provider_name: str

    def fetch_forecast(self, *, latitude: float, longitude: float, days: int = 7) -> WeatherDataset: ...

    def fetch_history(
        self,
        *,
        latitude: float,
        longitude: float,
        start_date: date,
        end_date: date,
    ) -> WeatherDataset: ...


class UrlJsonFetcher(Protocol):
    def get(self, url: str) -> dict[str, Any]: ...


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    if isinstance(value, str) and value.strip():
        return round(float(value), 2)
    return None


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str) and value.strip():
        return int(float(value))
    return None


def _series_value(payload: dict[str, Any], key: str, index: int) -> Any:
    values = payload.get(key)
    if not isinstance(values, list) or index >= len(values):
        return None
    return values[index]


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
            raise WeatherProviderError("provider_http_error", detail or str(exc)) from exc
        except URLError as exc:
            raise WeatherProviderError("provider_network_error", str(exc.reason)) from exc


class OpenMeteoWeatherProvider:
    provider_name = "open_meteo"

    def __init__(
        self,
        *,
        base_url: str,
        timeout_seconds: int,
        fetcher: UrlJsonFetcher | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.fetcher = fetcher or _UrlJsonFetcher(timeout_seconds=timeout_seconds)

    def fetch_forecast(self, *, latitude: float, longitude: float, days: int = 7) -> WeatherDataset:
        query = urlencode(
            {
                "latitude": latitude,
                "longitude": longitude,
                "timezone": "auto",
                "forecast_days": days,
                "daily": ",".join(
                    [
                        "temperature_2m_max",
                        "temperature_2m_min",
                        "precipitation_sum",
                        "precipitation_probability_max",
                        "et0_fao_evapotranspiration",
                        "weather_code",
                    ]
                ),
            }
        )
        payload = self.fetcher.get(f"{self.base_url}/v1/forecast?{query}")
        return self._dataset_from_daily_payload(payload=payload, kind="forecast")

    def fetch_history(
        self,
        *,
        latitude: float,
        longitude: float,
        start_date: date,
        end_date: date,
    ) -> WeatherDataset:
        query = urlencode(
            {
                "latitude": latitude,
                "longitude": longitude,
                "timezone": "auto",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "daily": ",".join(
                    [
                        "temperature_2m_max",
                        "temperature_2m_min",
                        "precipitation_sum",
                        "et0_fao_evapotranspiration",
                        "weather_code",
                    ]
                ),
            }
        )
        payload = self.fetcher.get(f"{self.base_url}/v1/archive?{query}")
        dataset = self._dataset_from_daily_payload(payload=payload, kind="history")
        return WeatherDataset(
            kind=dataset.kind,
            provider=dataset.provider,
            provider_mode=dataset.provider_mode,
            latitude=dataset.latitude,
            longitude=dataset.longitude,
            timezone=dataset.timezone,
            generated_at=dataset.generated_at,
            degraded_mode=dataset.degraded_mode,
            degraded_reasons=dataset.degraded_reasons,
            days=dataset.days,
            source_window_start=start_date.isoformat(),
            source_window_end=end_date.isoformat(),
        )

    def _dataset_from_daily_payload(self, *, payload: dict[str, Any], kind: str) -> WeatherDataset:
        daily = payload.get("daily")
        if not isinstance(daily, dict):
            reason = payload.get("reason")
            raise WeatherProviderError(
                "provider_invalid_payload",
                str(reason or "Open-Meteo response is missing daily data."),
            )
        times = daily.get("time")
        if not isinstance(times, list):
            raise WeatherProviderError(
                "provider_invalid_payload",
                "Open-Meteo response is missing the daily time series.",
            )
        days: list[WeatherDay] = []
        for index, item_date in enumerate(times):
            if not isinstance(item_date, str):
                continue
            days.append(
                WeatherDay(
                    date=item_date,
                    temperature_max_c=_coerce_float(_series_value(daily, "temperature_2m_max", index)),
                    temperature_min_c=_coerce_float(_series_value(daily, "temperature_2m_min", index)),
                    precipitation_mm=_coerce_float(_series_value(daily, "precipitation_sum", index)),
                    precipitation_probability_pct=_coerce_float(
                        _series_value(daily, "precipitation_probability_max", index)
                    ),
                    evapotranspiration_mm=_coerce_float(
                        _series_value(daily, "et0_fao_evapotranspiration", index)
                    ),
                    weather_code=_coerce_int(_series_value(daily, "weather_code", index)),
                )
            )
        return WeatherDataset(
            kind=kind,
            provider=self.provider_name,
            provider_mode="live",
            latitude=_coerce_float(payload.get("latitude")),
            longitude=_coerce_float(payload.get("longitude")),
            timezone=str(payload.get("timezone")) if payload.get("timezone") else None,
            generated_at=datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
            degraded_mode=False,
            degraded_reasons=[],
            days=days,
        )


def degraded_weather_dataset(
    *,
    kind: str,
    reason: str,
    detail: str | None = None,
) -> WeatherDataset:
    reasons = [reason]
    if detail:
        reasons.append(detail)
    return WeatherDataset(
        kind=kind,
        provider="open_meteo",
        provider_mode="degraded",
        latitude=None,
        longitude=None,
        timezone=None,
        generated_at=datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
        degraded_mode=True,
        degraded_reasons=reasons,
        days=[],
    )


def build_weather_provider(settings: Settings) -> WeatherProvider:
    return OpenMeteoWeatherProvider(
        base_url=settings.open_meteo_base_url,
        timeout_seconds=settings.weather_request_timeout_seconds,
    )


def default_history_window() -> tuple[date, date]:
    yesterday = datetime.now(tz=UTC).date() - timedelta(days=1)
    return yesterday - timedelta(days=2), yesterday
