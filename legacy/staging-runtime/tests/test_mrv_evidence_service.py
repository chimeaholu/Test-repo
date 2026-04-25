import json

from agro_v2.audit_events import AppendOnlyAuditEventWriter
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.mrv_evidence_service import (
    EvidenceAssumption,
    MrvEvidenceError,
    MrvEvidenceRecordService,
)


def build_signal(**overrides) -> ClimateRiskSignal:
    payload = {
        "signal_id": "climate:signal-19-1",
        "farm_id": "farm-019",
        "country_code": "GH",
        "region": "west_africa",
        "source_type": ClimateSourceType.WEATHER,
        "normalized_metric": "rainfall_24h_mm",
        "normalized_value": 61.2,
        "normalized_unit": "mm",
        "risk_hint": "heavy_rain",
        "observed_at": "2026-04-13T10:00:00Z",
        "provenance_key": "weather:open-meteo:rec-19-1",
        "reconciliation_key": "GH:farm-019:rainfall_24h_mm:2026-04-13T10:00:00Z",
        "confidence": 0.93,
    }
    payload.update(overrides)
    return ClimateRiskSignal(**payload)


def build_assumption(**overrides) -> EvidenceAssumption:
    payload = {
        "assumption_id": "asm-019-1",
        "statement": "Open Meteo rainfall proxy remains the best available source for this farm.",
        "basis": "Provider priority matrix v1",
        "confidence": 0.81,
    }
    payload.update(overrides)
    return EvidenceAssumption(**payload)


def test_service_records_provenance_assumptions_and_audit_evidence(tmp_path):
    audit_path = tmp_path / "audit.log"
    service = MrvEvidenceRecordService(audit_writer=AppendOnlyAuditEventWriter(audit_path))

    record = service.create_record(
        signal=build_signal(),
        assumptions=(build_assumption(),),
        methodology="ipcc-ar6-rainfall-risk.v1",
        period_start="2026-04-01T00:00:00Z",
        period_end="2026-04-30T23:59:59Z",
        actor_id="svc-mrv",
    )

    assert record.provenance[0].provenance_key == "weather:open-meteo:rec-19-1"
    assert record.assumptions[0].assumption_id == "asm-019-1"
    assert record.audit_event_id.startswith("aevt-")

    [line] = audit_path.read_text(encoding="utf-8").splitlines()
    persisted = json.loads(line)
    assert persisted["event_type"] == "mrv.evidence_recorded"
    assert persisted["metadata"]["journey"] == "EP-008"


def test_duplicate_signal_reuses_existing_evidence_record_without_duplicate_audit(tmp_path):
    audit_path = tmp_path / "audit.log"
    service = MrvEvidenceRecordService(audit_writer=AppendOnlyAuditEventWriter(audit_path))

    first = service.create_record(
        signal=build_signal(),
        assumptions=(build_assumption(),),
        methodology="ipcc-ar6-rainfall-risk.v1",
        period_start="2026-04-01T00:00:00Z",
        period_end="2026-04-30T23:59:59Z",
        actor_id="svc-mrv",
    )
    second = service.create_record(
        signal=build_signal(),
        assumptions=(build_assumption(),),
        methodology="ipcc-ar6-rainfall-risk.v1",
        period_start="2026-04-01T00:00:00Z",
        period_end="2026-04-30T23:59:59Z",
        actor_id="svc-mrv",
    )

    assert second == first
    assert len(audit_path.read_text(encoding="utf-8").splitlines()) == 1


def test_assumptions_are_required_for_mrv_evidence_records(tmp_path):
    service = MrvEvidenceRecordService(
        audit_writer=AppendOnlyAuditEventWriter(tmp_path / "audit.log")
    )

    try:
        service.create_record(
            signal=build_signal(),
            assumptions=(),
            methodology="ipcc-ar6-rainfall-risk.v1",
            period_start="2026-04-01T00:00:00Z",
            period_end="2026-04-30T23:59:59Z",
            actor_id="svc-mrv",
        )
    except MrvEvidenceError as exc:
        assert "assumptions" in str(exc)
    else:
        raise AssertionError("expected MrvEvidenceError")
