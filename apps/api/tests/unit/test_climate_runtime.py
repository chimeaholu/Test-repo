from datetime import UTC, datetime

from app.db.models.climate import ClimateObservation, FarmProfile
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.finance import FinanceRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.traceability import TraceabilityRepository
from app.db.repositories.workflow import WorkflowRepository
from app.services.commands.handlers import WorkflowCommandHandler


def _handler(session) -> WorkflowCommandHandler:
    return WorkflowCommandHandler(
        session,
        WorkflowRepository(session),
        MarketplaceRepository(session),
        LedgerRepository(session),
        EscrowRepository(session),
        FinanceRepository(session),
        TraceabilityRepository(session),
    )


def test_climate_alert_precedence_prefers_flood_over_heat(session) -> None:
    repository = ClimateRepository(session)
    profile = repository.upsert_farm_profile(
        farm_id="farm-gh-001",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        farm_name="Ama North Plot",
        district="Tamale",
        crop_type="Maize",
        hectares=3.5,
        latitude=9.4,
        longitude=-0.8,
    )
    observation = repository.create_observation(
        observation_id="obs-001",
        farm_id=profile.farm_id,
        actor_id=profile.actor_id,
        country_code=profile.country_code,
        source_id="sat-001",
        source_type="satellite",
        observed_at=datetime(2026, 4, 18, 12, 0, tzinfo=UTC),
        source_window_start=datetime(2026, 4, 17, 0, 0, tzinfo=UTC),
        source_window_end=datetime(2026, 4, 18, 0, 0, tzinfo=UTC),
        rainfall_mm=96,
        temperature_c=38,
        soil_moisture_pct=32,
        anomaly_score=0.2,
        ingestion_state="normalized",
        degraded_mode=False,
        degraded_reason_codes=[],
        assumptions=["Rain gauge cross-check pending."],
        provenance=[{"source_id": "sat-001", "source_type": "satellite"}],
        normalized_payload={"rainfall_mm": 96, "temperature_c": 38},
    )

    alert = _handler(session)._build_alert_from_observation(
        observation=observation,
        farm_profile=profile,
        schema_version="1.0.0",
    )

    assert alert.alert_type == "flood_risk"
    assert alert.severity == "critical"
    assert alert.precedence_rank == 10


def test_source_window_coverage_flags_missing_and_inconsistent_inputs(session) -> None:
    repository = ClimateRepository(session)
    observations = [
        ClimateObservation(
            observation_id="obs-a",
            farm_id="farm-gh-002",
            actor_id="actor-farmer-gh-ama",
            country_code="GH",
            source_id="wx-a",
            source_type="weather_api",
            observed_at=datetime(2026, 4, 18, 12, 0, tzinfo=UTC),
            source_window_start=datetime(2026, 4, 17, 0, 0, tzinfo=UTC),
            source_window_end=datetime(2026, 4, 17, 12, 0, tzinfo=UTC),
            rainfall_mm=10,
            temperature_c=31,
            soil_moisture_pct=18,
            anomaly_score=0.82,
            ingestion_state="degraded",
            degraded_mode=True,
            degraded_reason_codes=["source_window_inconsistent"],
            assumptions=["Satellite cloud cover interpolation."],
            provenance=[],
            normalized_payload={},
        )
    ]

    coverage = repository.evaluate_source_window_coverage(
        observations=observations,
        source_window_start=datetime(2026, 4, 17, 0, 0, tzinfo=UTC),
        source_window_end=datetime(2026, 4, 18, 0, 0, tzinfo=UTC),
    )

    assert coverage.fully_covered is False
    assert coverage.degraded is True
    assert "source_window_unavailable" in coverage.reason_codes
    assert "source_window_inconsistent" in coverage.reason_codes


def test_mrv_record_preserves_provenance_and_assumptions(session) -> None:
    repository = ClimateRepository(session)
    profile = repository.upsert_farm_profile(
        farm_id="farm-gh-003",
        actor_id="actor-farmer-gh-ama",
        country_code="GH",
        farm_name="Ama South Plot",
        district="Tamale",
        crop_type="Cassava",
        hectares=2.1,
        latitude=None,
        longitude=None,
    )
    record = repository.create_mrv_evidence_record(
        evidence_id="mrv-001",
        farm_id=profile.farm_id,
        actor_id=profile.actor_id,
        country_code=profile.country_code,
        evidence_type="climate_risk_baseline",
        method_tag="gh-mrv-v1",
        method_references=["GH-MRV-Guide-2026"],
        source_window_start=datetime(2026, 4, 10, 0, 0, tzinfo=UTC),
        source_window_end=datetime(2026, 4, 18, 0, 0, tzinfo=UTC),
        source_observation_ids=["obs-001"],
        alert_ids=["alert-001"],
        assumptions=["Rainfall trend estimated from blended satellite feed."],
        provenance=[{"source_id": "sat-001", "source_type": "satellite"}],
        source_completeness_state="degraded",
        degraded_mode=True,
        degraded_reason_codes=["source_window_unavailable"],
        summary={"observation_count": 1},
    )

    assert record.assumptions == ["Rainfall trend estimated from blended satellite feed."]
    assert record.method_references == ["GH-MRV-Guide-2026"]
    assert record.provenance == [{"source_id": "sat-001", "source_type": "satellite"}]
    assert record.degraded_mode is True
