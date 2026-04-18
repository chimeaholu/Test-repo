from agro_v2.climate_alert_rules import ClimateAlertRulesEngine, FarmClimateContext
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.frontend_climate_alert_center import FrontendClimateAlertCenter
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives


def build_signal() -> ClimateRiskSignal:
    return ClimateRiskSignal(
        signal_id="signal-13",
        farm_id="farm-13",
        country_code="GH",
        region="west_africa",
        source_type=ClimateSourceType.WEATHER,
        normalized_metric="rainfall_24h_mm",
        normalized_value=92.0,
        normalized_unit="mm",
        risk_hint="heavy_rain",
        observed_at="2026-04-13T08:30:00Z",
        provenance_key="weather:provider:13",
        reconciliation_key="farm-13-rainfall",
        confidence=0.94,
    )


def test_climate_alert_center_orders_by_precedence_and_keeps_provenance():
    engine = ClimateAlertRulesEngine()
    center = FrontendClimateAlertCenter(
        state_library=build_default_frontend_state_primitives()
    )
    [decision] = engine.evaluate(
        signals=(build_signal(),),
        context=FarmClimateContext(
            farm_id="farm-13",
            country_code="GH",
            crop_type="maize",
            season="flowering",
        ),
    )

    items = center.build_index((decision,))
    detail = center.build_detail(decision)
    audit = center.audit(alert_items=items, detail_surface=detail)

    assert items[0].severity == "critical"
    assert detail.provenance_key == "weather:provider:13"
    assert detail.trust_state.wrapper_component == "TrustPanel"
    assert audit.passed is True
