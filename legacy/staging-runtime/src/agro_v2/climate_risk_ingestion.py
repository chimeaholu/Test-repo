"""B-017 climate risk ingestion pipeline primitives."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .country_pack import resolve_country_policy


class ClimateRiskIngestionError(ValueError):
    """Raised when climate ingestion inputs or mappings are invalid."""


class ClimateSourceType(str, Enum):
    WEATHER = "weather"
    SATELLITE = "satellite"


@dataclass(frozen=True)
class ClimateIngestRecord:
    source_record_id: str
    source_type: ClimateSourceType
    provider: str
    country_code: str
    farm_id: str
    observed_at: str
    metric_name: str
    value: float
    unit: str
    latitude: float
    longitude: float
    confidence: float
    metadata: dict[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.source_record_id.strip():
            raise ClimateRiskIngestionError("source_record_id is required")
        if not self.provider.strip():
            raise ClimateRiskIngestionError("provider is required")
        if not self.country_code.strip():
            raise ClimateRiskIngestionError("country_code is required")
        if not self.farm_id.strip():
            raise ClimateRiskIngestionError("farm_id is required")
        if not self.observed_at.strip():
            raise ClimateRiskIngestionError("observed_at is required")
        if not self.metric_name.strip():
            raise ClimateRiskIngestionError("metric_name is required")
        if not self.unit.strip():
            raise ClimateRiskIngestionError("unit is required")
        if not 0 <= self.confidence <= 1:
            raise ClimateRiskIngestionError("confidence must be between 0 and 1")


@dataclass(frozen=True)
class ClimateRiskSignal:
    signal_id: str
    farm_id: str
    country_code: str
    region: str
    source_type: ClimateSourceType
    normalized_metric: str
    normalized_value: float
    normalized_unit: str
    risk_hint: str
    observed_at: str
    provenance_key: str
    reconciliation_key: str
    confidence: float


class ClimateRiskIngestionPipeline:
    """Normalizes weather and satellite inputs into provenance-safe climate signals."""

    def __init__(self) -> None:
        self._seen_records: set[str] = set()

    def ingest(self, records: tuple[ClimateIngestRecord, ...]) -> tuple[ClimateRiskSignal, ...]:
        normalized: list[ClimateRiskSignal] = []
        for record in records:
            dedupe_key = f"{record.provider}:{record.source_record_id}"
            if dedupe_key in self._seen_records:
                continue
            normalized.append(self._normalize(record))
            self._seen_records.add(dedupe_key)
        return tuple(normalized)

    def _normalize(self, record: ClimateIngestRecord) -> ClimateRiskSignal:
        policy = resolve_country_policy(record.country_code)
        normalized_metric, normalized_value, normalized_unit, risk_hint = _normalize_metric(record)
        return ClimateRiskSignal(
            signal_id=f"climate:{record.provider}:{record.source_record_id}",
            farm_id=record.farm_id,
            country_code=policy.country_code,
            region=policy.region,
            source_type=record.source_type,
            normalized_metric=normalized_metric,
            normalized_value=normalized_value,
            normalized_unit=normalized_unit,
            risk_hint=risk_hint,
            observed_at=record.observed_at,
            provenance_key=f"{record.source_type.value}:{record.provider}:{record.source_record_id}",
            reconciliation_key=f"{policy.country_code}:{record.farm_id}:{normalized_metric}:{record.observed_at}",
            confidence=record.confidence,
        )


def _normalize_metric(record: ClimateIngestRecord) -> tuple[str, float, str, str]:
    metric = record.metric_name.strip().lower()
    unit = record.unit.strip().lower()

    if record.source_type == ClimateSourceType.WEATHER and metric in {
        "precipitation_24h",
        "rainfall_24h",
    }:
        if unit not in {"mm", "millimeter", "millimeters"}:
            raise ClimateRiskIngestionError("weather precipitation must be provided in mm")
        value = round(record.value, 2)
        risk_hint = "heavy_rain" if value >= 50 else "normal"
        return "rainfall_24h_mm", value, "mm", risk_hint

    if record.source_type == ClimateSourceType.WEATHER and metric in {
        "temperature_max",
        "temp_max",
    }:
        if unit not in {"c", "celsius"}:
            raise ClimateRiskIngestionError("weather temperature must be provided in celsius")
        value = round(record.value, 2)
        risk_hint = "heat_watch" if value >= 35 else "normal"
        return "temperature_max_c", value, "c", risk_hint

    if record.source_type == ClimateSourceType.SATELLITE and metric == "ndvi":
        normalized = record.value / 10_000 if record.value > 1 else record.value
        if not 0 <= normalized <= 1:
            raise ClimateRiskIngestionError("satellite ndvi must normalize between 0 and 1")
        normalized = round(normalized, 3)
        risk_hint = "vegetation_stress" if normalized < 0.3 else "normal"
        return "ndvi_ratio", normalized, "ratio", risk_hint

    if record.source_type == ClimateSourceType.SATELLITE and metric == "soil_moisture":
        normalized = round(record.value, 3)
        risk_hint = "dryness_watch" if normalized < 0.2 else "normal"
        return "soil_moisture_ratio", normalized, "ratio", risk_hint

    raise ClimateRiskIngestionError(
        f"unsupported metric mapping: {record.source_type.value}:{record.metric_name}"
    )

