"""B-019 MRV evidence record service."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from .audit_events import AppendOnlyAuditEventWriter, AuditEvent
from .climate_risk_ingestion import ClimateRiskSignal


class MrvEvidenceError(ValueError):
    """Raised when an MRV evidence record request is invalid."""


@dataclass(frozen=True)
class EvidenceAssumption:
    assumption_id: str
    statement: str
    basis: str
    confidence: float

    def __post_init__(self) -> None:
        if not self.assumption_id.strip():
            raise MrvEvidenceError("assumption_id is required")
        if not self.statement.strip():
            raise MrvEvidenceError("statement is required")
        if not self.basis.strip():
            raise MrvEvidenceError("basis is required")
        if not 0 <= self.confidence <= 1:
            raise MrvEvidenceError("confidence must be between 0 and 1")


@dataclass(frozen=True)
class EvidenceProvenance:
    source_signal_id: str
    provenance_key: str
    reconciliation_key: str
    observed_at: str
    confidence: float

    def __post_init__(self) -> None:
        if not self.source_signal_id.strip():
            raise MrvEvidenceError("source_signal_id is required")
        if not self.provenance_key.strip():
            raise MrvEvidenceError("provenance_key is required")
        if not self.reconciliation_key.strip():
            raise MrvEvidenceError("reconciliation_key is required")
        if not self.observed_at.strip():
            raise MrvEvidenceError("observed_at is required")
        if not 0 <= self.confidence <= 1:
            raise MrvEvidenceError("confidence must be between 0 and 1")


@dataclass(frozen=True)
class MrvEvidenceRecord:
    record_id: str
    farm_id: str
    country_code: str
    evidence_type: str
    metric_name: str
    observed_value: float
    observed_unit: str
    period_start: str
    period_end: str
    methodology: str
    assumptions: tuple[EvidenceAssumption, ...]
    provenance: tuple[EvidenceProvenance, ...]
    created_at: str
    audit_event_id: str
    audit_event_hash: str
    metadata: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.record_id.strip():
            raise MrvEvidenceError("record_id is required")
        if not self.farm_id.strip():
            raise MrvEvidenceError("farm_id is required")
        if not self.country_code.strip():
            raise MrvEvidenceError("country_code is required")
        if not self.evidence_type.strip():
            raise MrvEvidenceError("evidence_type is required")
        if not self.metric_name.strip():
            raise MrvEvidenceError("metric_name is required")
        if not self.observed_unit.strip():
            raise MrvEvidenceError("observed_unit is required")
        if not self.period_start.strip():
            raise MrvEvidenceError("period_start is required")
        if not self.period_end.strip():
            raise MrvEvidenceError("period_end is required")
        if not self.methodology.strip():
            raise MrvEvidenceError("methodology is required")
        if not self.assumptions:
            raise MrvEvidenceError("assumptions must not be empty")
        if not self.provenance:
            raise MrvEvidenceError("provenance must not be empty")
        if not self.created_at.strip():
            raise MrvEvidenceError("created_at is required")
        if not self.audit_event_id.strip():
            raise MrvEvidenceError("audit_event_id is required")
        if not self.audit_event_hash.strip():
            raise MrvEvidenceError("audit_event_hash is required")


class MrvEvidenceRecordService:
    """Persists provenance-rich MRV evidence records with immutable audit evidence."""

    def __init__(
        self,
        *,
        audit_writer: AppendOnlyAuditEventWriter,
        clock=None,
    ) -> None:
        self._audit_writer = audit_writer
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._records: dict[str, MrvEvidenceRecord] = {}

    def create_record(
        self,
        *,
        signal: ClimateRiskSignal,
        assumptions: tuple[EvidenceAssumption, ...],
        methodology: str,
        period_start: str,
        period_end: str,
        actor_id: str,
        evidence_type: str = "climate_signal",
    ) -> MrvEvidenceRecord:
        if not methodology.strip():
            raise MrvEvidenceError("methodology is required")
        if not actor_id.strip():
            raise MrvEvidenceError("actor_id is required")
        if not evidence_type.strip():
            raise MrvEvidenceError("evidence_type is required")
        if not assumptions:
            raise MrvEvidenceError("assumptions must not be empty")

        existing = self._records.get(signal.reconciliation_key)
        if existing is not None:
            if (
                existing.metric_name != signal.normalized_metric
                or existing.observed_value != signal.normalized_value
                or existing.methodology != methodology
                or existing.assumptions != assumptions
            ):
                raise MrvEvidenceError("reconciliation_key already bound to different evidence content")
            return existing

        created_at = self._clock().astimezone(timezone.utc).isoformat()
        provenance = (
            EvidenceProvenance(
                source_signal_id=signal.signal_id,
                provenance_key=signal.provenance_key,
                reconciliation_key=signal.reconciliation_key,
                observed_at=signal.observed_at,
                confidence=signal.confidence,
            ),
        )
        record_id = f"mrv:{signal.farm_id}:{signal.normalized_metric}:{signal.observed_at}"
        audit_record = self._audit_writer.append_event(
            AuditEvent(
                event_type="mrv.evidence_recorded",
                actor_id=actor_id,
                schema_version="mrv.evidence.v1",
                payload={
                    "record_id": record_id,
                    "evidence_type": evidence_type,
                    "metric_name": signal.normalized_metric,
                    "observed_value": signal.normalized_value,
                    "observed_unit": signal.normalized_unit,
                    "assumptions": [
                        {
                            "assumption_id": item.assumption_id,
                            "statement": item.statement,
                            "basis": item.basis,
                            "confidence": item.confidence,
                        }
                        for item in assumptions
                    ],
                    "provenance": [
                        {
                            "source_signal_id": item.source_signal_id,
                            "provenance_key": item.provenance_key,
                            "reconciliation_key": item.reconciliation_key,
                            "observed_at": item.observed_at,
                            "confidence": item.confidence,
                        }
                        for item in provenance
                    ],
                },
                metadata={
                    "journey": "EP-008",
                    "data_check": "DI-006",
                    "country_code": signal.country_code,
                    "farm_id": signal.farm_id,
                },
            )
        )
        record = MrvEvidenceRecord(
            record_id=record_id,
            farm_id=signal.farm_id,
            country_code=signal.country_code,
            evidence_type=evidence_type,
            metric_name=signal.normalized_metric,
            observed_value=signal.normalized_value,
            observed_unit=signal.normalized_unit,
            period_start=period_start,
            period_end=period_end,
            methodology=methodology,
            assumptions=assumptions,
            provenance=provenance,
            created_at=created_at,
            audit_event_id=audit_record["event_id"],
            audit_event_hash=audit_record["event_hash"],
            metadata={
                "journey": "EP-008",
                "data_check": "DI-006",
            },
        )
        self._records[signal.reconciliation_key] = record
        return record

    def list_for_farm(self, farm_id: str) -> tuple[MrvEvidenceRecord, ...]:
        return tuple(
            record
            for record in self._records.values()
            if record.farm_id == farm_id
        )
