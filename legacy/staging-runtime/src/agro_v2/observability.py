"""B-027 observability and SLO instrumentation by channel and country."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

from .country_pack import resolve_country_policy
from .policy_guardrails import RiskLevel


class ObservabilityError(ValueError):
    """Raised when telemetry or SLO instrumentation contracts are invalid."""


class TelemetryChannel(str, Enum):
    USSD = "ussd"
    WHATSAPP = "whatsapp"
    PWA = "pwa"
    SMS = "sms"
    API = "api"


class SpanStatus(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    ERROR = "error"


ALLOWED_METRIC_NAMES = frozenset(
    {
        "request.count",
        "request.latency_ms",
        "delivery.success",
        "delivery.failure",
        "sync.replay.count",
    }
)
REQUIRED_TAG_KEYS = frozenset({"channel", "country_code", "operation"})


@dataclass(frozen=True)
class TelemetryMetric:
    metric_id: str
    metric_name: str
    channel: TelemetryChannel
    country_code: str
    operation: str
    value: float
    emitted_at: str
    tags: dict[str, str]

    def __post_init__(self) -> None:
        if not self.metric_id.strip():
            raise ObservabilityError("metric_id is required")
        if self.metric_name not in ALLOWED_METRIC_NAMES:
            raise ObservabilityError("metric_name is not allowlisted")
        if not self.country_code.strip():
            raise ObservabilityError("country_code is required")
        if not self.operation.strip():
            raise ObservabilityError("operation is required")
        if self.value < 0:
            raise ObservabilityError("value must be >= 0")
        if not isinstance(self.tags, dict):
            raise ObservabilityError("tags must be a mapping")
        missing = REQUIRED_TAG_KEYS.difference(self.tags)
        if missing:
            raise ObservabilityError(f"missing telemetry tag(s): {sorted(missing)}")
        if self.tags["channel"] != self.channel.value:
            raise ObservabilityError("tags.channel must match channel")
        if self.tags["country_code"].upper() != self.country_code.upper():
            raise ObservabilityError("tags.country_code must match country_code")
        if self.tags["operation"] != self.operation:
            raise ObservabilityError("tags.operation must match operation")
        resolve_country_policy(self.country_code)
        _parse_timestamp(self.emitted_at)


@dataclass(frozen=True)
class TraceSpan:
    trace_id: str
    span_id: str
    channel: TelemetryChannel
    country_code: str
    operation: str
    latency_ms: int
    status: SpanStatus
    emitted_at: str
    tags: dict[str, str]

    def __post_init__(self) -> None:
        if not self.trace_id.strip():
            raise ObservabilityError("trace_id is required")
        if not self.span_id.strip():
            raise ObservabilityError("span_id is required")
        if not self.country_code.strip():
            raise ObservabilityError("country_code is required")
        if not self.operation.strip():
            raise ObservabilityError("operation is required")
        if self.latency_ms < 0:
            raise ObservabilityError("latency_ms must be >= 0")
        if not isinstance(self.tags, dict):
            raise ObservabilityError("tags must be a mapping")
        missing = REQUIRED_TAG_KEYS.difference(self.tags)
        if missing:
            raise ObservabilityError(f"missing telemetry tag(s): {sorted(missing)}")
        if self.tags["channel"] != self.channel.value:
            raise ObservabilityError("tags.channel must match channel")
        if self.tags["country_code"].upper() != self.country_code.upper():
            raise ObservabilityError("tags.country_code must match country_code")
        if self.tags["operation"] != self.operation:
            raise ObservabilityError("tags.operation must match operation")
        resolve_country_policy(self.country_code)
        _parse_timestamp(self.emitted_at)


@dataclass(frozen=True)
class ServiceLevelObjective:
    slo_id: str
    channel: TelemetryChannel
    country_code: str
    operation: str
    min_success_rate: float
    max_p95_latency_ms: int
    min_sample_size: int

    def __post_init__(self) -> None:
        if not self.slo_id.strip():
            raise ObservabilityError("slo_id is required")
        if not self.country_code.strip():
            raise ObservabilityError("country_code is required")
        if not self.operation.strip():
            raise ObservabilityError("operation is required")
        if not 0 < self.min_success_rate <= 1:
            raise ObservabilityError("min_success_rate must be between 0 and 1")
        if self.max_p95_latency_ms <= 0:
            raise ObservabilityError("max_p95_latency_ms must be > 0")
        if self.min_sample_size <= 0:
            raise ObservabilityError("min_sample_size must be > 0")
        resolve_country_policy(self.country_code)


@dataclass(frozen=True)
class SloAlertDecision:
    slo_id: str
    channel: str
    country_code: str
    operation: str
    sample_size: int
    success_rate: float
    p95_latency_ms: int
    breached: bool
    severity: str
    data_check_id: str
    metadata: dict[str, object]


class ObservabilityInstrumentationService:
    """Collects idempotent telemetry and evaluates per-slice SLO status."""

    def __init__(self) -> None:
        self._metrics: dict[str, tuple[tuple[object, ...], TelemetryMetric]] = {}
        self._spans: dict[str, tuple[tuple[object, ...], TraceSpan]] = {}

    @property
    def metrics(self) -> tuple[TelemetryMetric, ...]:
        return tuple(record for _, record in self._metrics.values())

    @property
    def spans(self) -> tuple[TraceSpan, ...]:
        return tuple(record for _, record in self._spans.values())

    def record_metric(self, metric: TelemetryMetric) -> TelemetryMetric:
        fingerprint = (
            metric.metric_name,
            metric.channel.value,
            metric.country_code.upper(),
            metric.operation,
            metric.value,
            metric.emitted_at,
            tuple(sorted(metric.tags.items())),
        )
        return self._record_idempotent(
            store=self._metrics,
            key=metric.metric_id,
            fingerprint=fingerprint,
            record=metric,
            error_message="metric_id already bound to different telemetry payload",
        )

    def record_span(self, span: TraceSpan) -> TraceSpan:
        fingerprint = (
            span.trace_id,
            span.channel.value,
            span.country_code.upper(),
            span.operation,
            span.latency_ms,
            span.status.value,
            span.emitted_at,
            tuple(sorted(span.tags.items())),
        )
        return self._record_idempotent(
            store=self._spans,
            key=span.span_id,
            fingerprint=fingerprint,
            record=span,
            error_message="span_id already bound to different trace payload",
        )

    def evaluate_slo(self, slo: ServiceLevelObjective) -> SloAlertDecision:
        relevant_spans = [
            span
            for span in self.spans
            if span.channel == slo.channel
            and span.country_code.upper() == slo.country_code.upper()
            and span.operation == slo.operation
        ]
        sample_size = len(relevant_spans)
        if sample_size < slo.min_sample_size:
            raise ObservabilityError("insufficient telemetry sample size for SLO evaluation")

        success_count = sum(span.status != SpanStatus.ERROR for span in relevant_spans)
        success_rate = round(success_count / sample_size, 4)
        p95_latency_ms = _p95(span.latency_ms for span in relevant_spans)
        breached = (
            success_rate < slo.min_success_rate or p95_latency_ms > slo.max_p95_latency_ms
        )
        severity = _severity_for(
            success_rate=success_rate,
            min_success_rate=slo.min_success_rate,
            p95_latency_ms=p95_latency_ms,
            max_p95_latency_ms=slo.max_p95_latency_ms,
            breached=breached,
        )
        return SloAlertDecision(
            slo_id=slo.slo_id,
            channel=slo.channel.value,
            country_code=slo.country_code.upper(),
            operation=slo.operation,
            sample_size=sample_size,
            success_rate=success_rate,
            p95_latency_ms=p95_latency_ms,
            breached=breached,
            severity=severity.value,
            data_check_id="DI-002",
            metadata={
                "journeys": ["PF-001", "PF-004"],
                "status_counts": {
                    "ok_or_degraded": success_count,
                    "error": sample_size - success_count,
                },
            },
        )

    @staticmethod
    def _record_idempotent(*, store, key, fingerprint, record, error_message):
        cached = store.get(key)
        if cached is not None:
            cached_fingerprint, cached_record = cached
            if cached_fingerprint != fingerprint:
                raise ObservabilityError(error_message)
            return cached_record
        store[key] = (fingerprint, record)
        return record


def _parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ObservabilityError("timestamp must be valid ISO 8601") from exc
    if parsed.tzinfo is None:
        raise ObservabilityError("timestamp must include timezone")
    return parsed.astimezone(timezone.utc)


def _p95(latencies) -> int:
    ordered = sorted(latencies)
    if not ordered:
        raise ObservabilityError("cannot compute latency percentile without spans")
    index = max(0, ((len(ordered) - 1) * 95) // 100)
    return ordered[index]


def _severity_for(
    *,
    success_rate: float,
    min_success_rate: float,
    p95_latency_ms: int,
    max_p95_latency_ms: int,
    breached: bool,
) -> RiskLevel:
    if not breached:
        return RiskLevel.LOW
    success_gap = min_success_rate - success_rate
    latency_gap = p95_latency_ms - max_p95_latency_ms
    if success_gap >= 0.1 or latency_gap >= 500:
        return RiskLevel.HIGH
    return RiskLevel.MEDIUM
