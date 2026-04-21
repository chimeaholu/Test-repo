from agro_v2.advisory_retrieval import CitationMetadata
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.enterprise_analytics_mart import (
    EnterpriseAnalyticsDataMartContract,
    EnterpriseAnalyticsSourceBundle,
)
from agro_v2.frontend_admin_analytics import FrontendAdminAnalytics
from agro_v2.frontend_app_shell import AppRole, UnifiedAppShell
from agro_v2.listings import CommodityListing, ListingStatus
from agro_v2.observability import (
    ObservabilityInstrumentationService,
    ServiceLevelObjective,
    SpanStatus,
    TelemetryChannel,
    TraceSpan,
)
from agro_v2.traceability_event_chain import TraceabilityEventChainService, TraceabilityEventType


def build_mart_row():
    listing = CommodityListing(
        listing_id="listing-21",
        seller_id="seller-21",
        commodity_code="maize",
        quantity_kg=900,
        price_minor=300000,
        currency="GHS",
        status=ListingStatus.PUBLISHED,
        version=1,
        created_at="2026-04-13T12:00:00Z",
        updated_at="2026-04-13T12:00:00Z",
        metadata={},
    )
    chain = TraceabilityEventChainService()
    chain.start_chain(
        consignment_id="cons-21",
        listing=listing,
        actor_id="seller-21",
        occurred_at="2026-04-13T12:00:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("proof-21",),
    )
    chain.append_event(
        consignment_id="cons-21",
        event_type=TraceabilityEventType.QUALITY_CHECKED,
        actor_id="coop-21",
        occurred_at="2026-04-13T12:20:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("proof-22",),
        payload={"grade": "A"},
    )
    return EnterpriseAnalyticsDataMartContract().project_bundle(
        EnterpriseAnalyticsSourceBundle(
            country_code="GH",
            listing=listing,
            climate_signals=(
                ClimateRiskSignal(
                    signal_id="signal-21",
                    farm_id="farm-21",
                    country_code="GH",
                    region="west_africa",
                    source_type=ClimateSourceType.WEATHER,
                    normalized_metric="rainfall_24h_mm",
                    normalized_value=80.0,
                    normalized_unit="mm",
                    risk_hint="elevated",
                    observed_at="2026-04-13T12:10:00Z",
                    provenance_key="weather:21",
                    reconciliation_key="farm-21-rain",
                    confidence=0.91,
                ),
            ),
            traceability_events=chain.read_chain("cons-21"),
            citations=(
                CitationMetadata(
                    citation_id="cite-21",
                    source_id="src-21",
                    rank=1,
                    title="Climate note",
                    publisher="MoFA Ghana",
                    url="https://example.com/climate",
                    published_at="2026-04-01",
                    excerpt="Rainfall rising.",
                    relevance_score=0.9,
                    retrieved_at="2026-04-13T12:00:00Z",
                    render_label="[1] Climate note",
                ),
            ),
        )
    )


def build_slo():
    service = ObservabilityInstrumentationService()
    service.record_span(
        TraceSpan(
            trace_id="trace-21",
            span_id="span-21",
            channel=TelemetryChannel.PWA,
            country_code="GH",
            operation="finance.review",
            latency_ms=180,
            status=SpanStatus.OK,
            emitted_at="2026-04-13T12:00:00Z",
            tags={"channel": "pwa", "country_code": "GH", "operation": "finance.review"},
        )
    )
    service.record_span(
        TraceSpan(
            trace_id="trace-22",
            span_id="span-22",
            channel=TelemetryChannel.PWA,
            country_code="GH",
            operation="finance.review",
            latency_ms=420,
            status=SpanStatus.ERROR,
            emitted_at="2026-04-13T12:01:00Z",
            tags={"channel": "pwa", "country_code": "GH", "operation": "finance.review"},
        )
    )
    return service.evaluate_slo(
        ServiceLevelObjective(
            slo_id="slo-21",
            channel=TelemetryChannel.PWA,
            country_code="GH",
            operation="finance.review",
            min_success_rate=0.95,
            max_p95_latency_ms=250,
            min_sample_size=2,
        )
    )


def test_admin_analytics_surface_projects_metrics_and_alerts():
    shell = UnifiedAppShell().build_snapshot(
        role=AppRole.ADMIN,
        width_px=1440,
        pending_count=1,
        notifications_badge_count=2,
    )
    surface = FrontendAdminAnalytics().build_surface(
        shell_snapshot=shell,
        mart_row=build_mart_row(),
        slo_decisions=(build_slo(),),
    )
    audit = FrontendAdminAnalytics().audit(surface)

    assert surface.metric_cards[0].label == "Country"
    assert surface.alert_rows[0].detail_route == "/app/admin/observability#slo-21"
    assert audit.passed is True
