from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.control_plane import RolloutStateRecord, TelemetryObservationRecord


class ControlPlaneRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_telemetry_by_observation_id(
        self, observation_id: str
    ) -> TelemetryObservationRecord | None:
        statement = select(TelemetryObservationRecord).where(
            TelemetryObservationRecord.observation_id == observation_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_telemetry_for_country(
        self, *, country_code: str, service_name: str | None = None
    ) -> list[TelemetryObservationRecord]:
        statement = select(TelemetryObservationRecord).where(
            TelemetryObservationRecord.country_code == country_code
        )
        if service_name:
            statement = statement.where(TelemetryObservationRecord.service_name == service_name)
        statement = statement.order_by(
            TelemetryObservationRecord.window_ended_at.desc(),
            TelemetryObservationRecord.id.desc(),
        )
        return list(self.session.execute(statement).scalars().all())

    def list_latest_telemetry_by_service(
        self, *, country_code: str
    ) -> dict[str, TelemetryObservationRecord]:
        grouped: dict[str, list[TelemetryObservationRecord]] = defaultdict(list)
        for record in self.list_telemetry_for_country(country_code=country_code):
            grouped[record.service_name].append(record)
        return {service_name: records[0] for service_name, records in grouped.items()}

    def create_telemetry_observation(
        self,
        *,
        observation_id: str,
        idempotency_key: str,
        request_id: str,
        actor_id: str,
        country_code: str,
        channel: str,
        service_name: str,
        slo_id: str | None,
        alert_severity: str | None,
        audit_event_id: int,
        source_kind: str,
        window_started_at: datetime,
        window_ended_at: datetime,
        success_count: int,
        error_count: int,
        sample_count: int,
        latency_p95_ms: float,
        stale_after_seconds: int,
        release_blocking: bool,
        note: str | None,
        schema_version: str,
        ingested_at: datetime,
    ) -> TelemetryObservationRecord:
        record = TelemetryObservationRecord(
            observation_id=observation_id,
            idempotency_key=idempotency_key,
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
            channel=channel,
            service_name=service_name,
            slo_id=slo_id,
            alert_severity=alert_severity,
            audit_event_id=audit_event_id,
            source_kind=source_kind,
            window_started_at=window_started_at,
            window_ended_at=window_ended_at,
            success_count=success_count,
            error_count=error_count,
            sample_count=sample_count,
            latency_p95_ms=latency_p95_ms,
            stale_after_seconds=stale_after_seconds,
            release_blocking=release_blocking,
            note=note,
            schema_version=schema_version,
            ingested_at=ingested_at,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def list_rollout_history(
        self,
        *,
        country_code: str,
        service_name: str | None = None,
        scope_key: str | None = None,
    ) -> list[RolloutStateRecord]:
        statement = select(RolloutStateRecord).where(
            RolloutStateRecord.country_code == country_code
        )
        if service_name:
            statement = statement.where(RolloutStateRecord.service_name == service_name)
        if scope_key:
            statement = statement.where(RolloutStateRecord.scope_key == scope_key)
        statement = statement.order_by(
            RolloutStateRecord.changed_at.desc(),
            RolloutStateRecord.id.desc(),
        )
        return list(self.session.execute(statement).scalars().all())

    def list_current_rollout_states(self, *, country_code: str) -> list[RolloutStateRecord]:
        current: dict[tuple[str, str], RolloutStateRecord] = {}
        for record in self.list_rollout_history(country_code=country_code):
            key = (record.service_name, record.scope_key)
            current.setdefault(key, record)
        return list(current.values())

    def get_current_rollout_state(
        self, *, country_code: str, service_name: str, scope_key: str
    ) -> RolloutStateRecord | None:
        history = self.list_rollout_history(
            country_code=country_code,
            service_name=service_name,
            scope_key=scope_key,
        )
        return history[0] if history else None

    def create_rollout_state(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        channel: str,
        service_name: str,
        slo_id: str | None,
        alert_severity: str | None,
        audit_event_id: int,
        scope_key: str,
        state: str,
        previous_state: str | None,
        intent: str,
        reason_code: str,
        reason_detail: str,
        limited_release_percent: int | None,
        schema_version: str,
        changed_at: datetime,
    ) -> RolloutStateRecord:
        record = RolloutStateRecord(
            request_id=request_id,
            idempotency_key=idempotency_key,
            actor_id=actor_id,
            actor_role=actor_role,
            country_code=country_code,
            channel=channel,
            service_name=service_name,
            slo_id=slo_id,
            alert_severity=alert_severity,
            audit_event_id=audit_event_id,
            scope_key=scope_key,
            state=state,
            previous_state=previous_state,
            intent=intent,
            reason_code=reason_code,
            reason_detail=reason_detail,
            limited_release_percent=limited_release_percent,
            schema_version=schema_version,
            changed_at=changed_at,
        )
        self.session.add(record)
        self.session.flush()
        return record
