from agro_v2.advisory_retrieval import AdvisoryRetrievalResult, CitationMetadata
from agro_v2.climate_alert_rules import ClimateAlertRulesEngine, FarmClimateContext
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.frontend_accessibility_primitives import build_default_frontend_accessibility_primitives
from agro_v2.frontend_advisory_routes import FrontendAdvisoryRoutes
from agro_v2.frontend_advisor_workbench import (
    AdvisorInterventionLogRow,
    FrontendAdvisorWorkbench,
)
from agro_v2.frontend_climate_alert_center import FrontendClimateAlertCenter
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives
from agro_v2.multilingual_delivery import DeliveryAudience, LocalizedCopy, MultilingualDeliveryFramework


def build_answer():
    routes = FrontendAdvisoryRoutes(
        accessibility=build_default_frontend_accessibility_primitives(),
        delivery=MultilingualDeliveryFramework(),
    )
    result = AdvisoryRetrievalResult(
        query="soil health",
        country_code="GH",
        citations=(
            CitationMetadata(
                citation_id="cite-20",
                source_id="src-20",
                rank=1,
                title="Soil Health Note",
                publisher="MoFA Ghana",
                url="https://example.com/soil",
                published_at="2026-04-01",
                excerpt="Apply compost early.",
                relevance_score=0.88,
                retrieved_at="2026-04-13T12:00:00Z",
                render_label="[1] Soil Health Note",
            ),
        ),
        source_ids=("src-20",),
        total_candidates=2,
        filtered_candidates=1,
    )
    return routes.build_answer(
        audience=DeliveryAudience(country_code="GH", preferred_locale="en-GH"),
        advisory_result=result,
        localized_content={"en": LocalizedCopy(body="Apply compost early.", cta_label="Open proof")},
    )


def build_alert():
    engine = ClimateAlertRulesEngine()
    [decision] = engine.evaluate(
        signals=(
            ClimateRiskSignal(
                signal_id="signal-20",
                farm_id="farm-20",
                country_code="GH",
                region="west_africa",
                source_type=ClimateSourceType.WEATHER,
                normalized_metric="rainfall_24h_mm",
                normalized_value=95.0,
                normalized_unit="mm",
                risk_hint="heavy_rain",
                observed_at="2026-04-13T12:30:00Z",
                provenance_key="weather:20",
                reconciliation_key="farm-20-rain",
                confidence=0.92,
            ),
        ),
        context=FarmClimateContext(
            farm_id="farm-20",
            country_code="GH",
            crop_type="maize",
            season="flowering",
        ),
    )
    return FrontendClimateAlertCenter(
        state_library=build_default_frontend_state_primitives()
    ).build_detail(decision)


def test_advisor_workbench_composes_queue_and_intervention_log():
    surface = FrontendAdvisorWorkbench().build_surface(
        answer_surface=build_answer(),
        alert_detail=build_alert(),
        intervention_log=(
            AdvisorInterventionLogRow(
                case_id="req-20",
                occurred_at="2026-04-13T12:40:00Z",
                summary="Shared soil-health follow-up in person",
            ),
        ),
    )
    audit = FrontendAdvisorWorkbench().audit(surface)

    assert len(surface.queue_items) == 2
    assert surface.intervention_log[0].summary.startswith("Shared soil-health")
    assert audit.passed is True
