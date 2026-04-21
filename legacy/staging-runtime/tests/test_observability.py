import pytest

from agro_v2.observability import (
    ObservabilityError,
    ObservabilityInstrumentationService,
    ServiceLevelObjective,
    SpanStatus,
    TelemetryChannel,
    TelemetryMetric,
    TraceSpan,
)


def build_metric(**overrides) -> TelemetryMetric:
    payload = {
        "metric_id": "metric-027-1",
        "metric_name": "request.count",
        "channel": TelemetryChannel.WHATSAPP,
        "country_code": "GH",
        "operation": "partner.analytics.fetch",
        "value": 1,
        "emitted_at": "2026-04-13T09:20:00Z",
        "tags": {
            "channel": "whatsapp",
            "country_code": "GH",
            "operation": "partner.analytics.fetch",
        },
    }
    payload.update(overrides)
    return TelemetryMetric(**payload)


def build_span(**overrides) -> TraceSpan:
    payload = {
        "trace_id": "trace-027-1",
        "span_id": "span-027-1",
        "channel": TelemetryChannel.WHATSAPP,
        "country_code": "GH",
        "operation": "partner.analytics.fetch",
        "latency_ms": 180,
        "status": SpanStatus.OK,
        "emitted_at": "2026-04-13T09:20:01Z",
        "tags": {
            "channel": "whatsapp",
            "country_code": "GH",
            "operation": "partner.analytics.fetch",
        },
    }
    payload.update(overrides)
    return TraceSpan(**payload)


def test_recorded_telemetry_evaluates_to_passing_slo():
    service = ObservabilityInstrumentationService()
    service.record_metric(build_metric())
    service.record_span(build_span())
    service.record_span(
        build_span(
            trace_id="trace-027-2",
            span_id="span-027-2",
            latency_ms=210,
            emitted_at="2026-04-13T09:20:02Z",
        )
    )
    service.record_span(
        build_span(
            trace_id="trace-027-3",
            span_id="span-027-3",
            latency_ms=260,
            status=SpanStatus.DEGRADED,
            emitted_at="2026-04-13T09:20:03Z",
        )
    )

    decision = service.evaluate_slo(
        ServiceLevelObjective(
            slo_id="slo-027-1",
            channel=TelemetryChannel.WHATSAPP,
            country_code="GH",
            operation="partner.analytics.fetch",
            min_success_rate=0.95,
            max_p95_latency_ms=300,
            min_sample_size=3,
        )
    )

    assert decision.breached is False
    assert decision.severity == "low"
    assert decision.data_check_id == "DI-002"


def test_schema_validation_rejects_missing_tags_and_negative_latency():
    with pytest.raises(ObservabilityError, match="missing telemetry tag"):
        build_metric(tags={"channel": "whatsapp"})

    with pytest.raises(ObservabilityError, match="latency_ms"):
        build_span(latency_ms=-1)

    with pytest.raises(ObservabilityError, match="allowlisted"):
        build_metric(metric_name="unknown.metric")


def test_idempotency_replays_same_span_and_rejects_drift():
    service = ObservabilityInstrumentationService()
    span = build_span()

    first = service.record_span(span)
    replay = service.record_span(span)

    assert replay == first

    with pytest.raises(ObservabilityError, match="span_id already bound"):
        service.record_span(build_span(latency_ms=999))


def test_slo_breach_raises_high_severity_alert():
    service = ObservabilityInstrumentationService()
    for idx, latency in enumerate((900, 1100, 1300), start=1):
        service.record_span(
            build_span(
                trace_id=f"trace-027-breach-{idx}",
                span_id=f"span-027-breach-{idx}",
                latency_ms=latency,
                status=SpanStatus.ERROR if idx == 1 else SpanStatus.OK,
                emitted_at=f"2026-04-13T09:21:0{idx}Z",
            )
        )

    decision = service.evaluate_slo(
        ServiceLevelObjective(
            slo_id="slo-027-2",
            channel=TelemetryChannel.WHATSAPP,
            country_code="GH",
            operation="partner.analytics.fetch",
            min_success_rate=0.95,
            max_p95_latency_ms=400,
            min_sample_size=3,
        )
    )

    assert decision.breached is True
    assert decision.severity == "high"
    assert decision.metadata["status_counts"]["error"] == 1
