from agro_v2.climate_alert_rules import (
    AlertSeverity,
    ClimateAlertRulesEngine,
    ClimateAlertRulesError,
    FarmClimateContext,
)
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.state_store import CanonicalStateStore


def build_signal(**overrides) -> ClimateRiskSignal:
    payload = {
        "signal_id": "climate:signal-18-1",
        "farm_id": "farm-18",
        "country_code": "GH",
        "region": "west_africa",
        "source_type": ClimateSourceType.WEATHER,
        "normalized_metric": "rainfall_24h_mm",
        "normalized_value": 82.0,
        "normalized_unit": "mm",
        "risk_hint": "heavy_rain",
        "observed_at": "2026-04-13T08:30:00Z",
        "provenance_key": "weather:open-meteo:rec-18-1",
        "reconciliation_key": "GH:farm-18:rainfall_24h_mm:2026-04-13T08:30:00Z",
        "confidence": 0.94,
    }
    payload.update(overrides)
    return ClimateRiskSignal(**payload)


def build_context(**overrides) -> FarmClimateContext:
    payload = {
        "farm_id": "farm-18",
        "country_code": "GH",
        "crop_type": "maize",
        "season": "flowering",
    }
    payload.update(overrides)
    return FarmClimateContext(**payload)


def test_rules_engine_applies_farm_context_threshold_and_escalates_flood_alert():
    engine = ClimateAlertRulesEngine()

    [decision] = engine.evaluate(
        signals=(build_signal(normalized_value=92.0),),
        context=build_context(),
    )

    assert decision.alert_type == "flood_watch"
    assert decision.severity == AlertSeverity.CRITICAL
    assert decision.threshold_value == 90.0
    assert decision.precedence == 100


def test_threshold_override_can_tighten_dryness_watch_for_farm_context():
    engine = ClimateAlertRulesEngine()

    [decision] = engine.evaluate(
        signals=(
            build_signal(
                signal_id="climate:signal-18-2",
                source_type=ClimateSourceType.SATELLITE,
                normalized_metric="soil_moisture_ratio",
                normalized_value=0.22,
                normalized_unit="ratio",
                risk_hint="dryness_watch",
                provenance_key="satellite:chirps:rec-18-2",
                reconciliation_key="GH:farm-18:soil_moisture_ratio:2026-04-13T08:45:00Z",
            ),
        ),
        context=build_context(threshold_overrides={"soil_moisture_ratio": 0.25}),
    )

    assert decision.alert_type == "dryness_watch"
    assert decision.threshold_value == 0.25
    assert decision.severity == AlertSeverity.WARNING


def test_precedence_orders_alerts_with_highest_risk_first():
    engine = ClimateAlertRulesEngine()

    decisions = engine.evaluate(
        signals=(
            build_signal(normalized_value=92.0),
            build_signal(
                signal_id="climate:signal-18-3",
                normalized_metric="ndvi_ratio",
                normalized_value=0.21,
                normalized_unit="ratio",
                risk_hint="vegetation_stress",
                source_type=ClimateSourceType.SATELLITE,
                provenance_key="satellite:sentinel:rec-18-3",
                reconciliation_key="GH:farm-18:ndvi_ratio:2026-04-13T08:40:00Z",
            ),
            build_signal(
                signal_id="climate:signal-18-4",
                normalized_metric="temperature_max_c",
                normalized_value=36.1,
                normalized_unit="c",
                risk_hint="heat_watch",
                provenance_key="weather:open-meteo:rec-18-4",
                reconciliation_key="GH:farm-18:temperature_max_c:2026-04-13T08:35:00Z",
            ),
        ),
        context=build_context(),
    )

    assert [decision.alert_type for decision in decisions] == [
        "flood_watch",
        "vegetation_stress",
        "heat_stress",
    ]
    assert decisions[0].severity == AlertSeverity.CRITICAL
    assert decisions[1].precedence > decisions[2].precedence


def test_workflow_command_preserves_threshold_and_provenance_fields():
    engine = ClimateAlertRulesEngine()
    store = CanonicalStateStore()

    [decision] = engine.evaluate(
        signals=(build_signal(normalized_value=92.0),),
        context=build_context(),
    )
    store.apply(
        decision.to_workflow_command(
            workflow_id="climate-alert:farm-18",
            idempotency_key="alert-18-1",
        )
    )
    snapshot = store.snapshot("climate-alert:farm-18")

    assert snapshot.state["climate_alert"]["alert_type"] == "flood_watch"
    assert snapshot.state["climate_alert"]["threshold_value"] == 90.0
    assert snapshot.state["climate_alert"]["provenance_key"] == "weather:open-meteo:rec-18-1"


def test_signal_context_mismatch_is_rejected():
    engine = ClimateAlertRulesEngine()

    try:
        engine.evaluate(
            signals=(build_signal(farm_id="farm-other"),),
            context=build_context(),
        )
    except ClimateAlertRulesError as exc:
        assert "farm_id" in str(exc)
    else:
        raise AssertionError("expected ClimateAlertRulesError")
