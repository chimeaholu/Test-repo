from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.core.config import Settings
from app.db.models.audit import AuditEvent
from app.db.models.control_plane import RolloutStateRecord, TelemetryObservationRecord
from app.db.repositories.control_plane import ControlPlaneRepository

ADMIN_SERVICES = (
    "admin_control_plane",
    "marketplace",
    "advisory",
    "finance",
    "traceability",
    "climate",
    "rollout_control",
)


@dataclass(frozen=True)
class EvaluationResult:
    service_name: str
    objective_kind: str
    objective_target: float
    observed_value: float | None
    status: str
    breach_count: int
    supporting_observation_ids: list[str]
    rationale: str
    release_blocking: bool
    alert_severity: str | None
    slo_id: str | None
    window_started_at: str | None
    window_ended_at: str | None


def utc_now() -> datetime:
    return datetime.now(tz=UTC)


def isoformat_z(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def parse_iso_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized).astimezone(UTC)


def evaluate_observation(
    observation: TelemetryObservationRecord | None, *, now: datetime, service_name: str
) -> EvaluationResult:
    if observation is None:
        return EvaluationResult(
            service_name=service_name,
            objective_kind="freshness_seconds",
            objective_target=300,
            observed_value=None,
            status="breached",
            breach_count=1,
            supporting_observation_ids=[],
            rationale="No telemetry observation has been ingested for this service; runtime is explicitly degraded.",
            release_blocking=True,
            alert_severity="critical",
            slo_id=None,
            window_started_at=None,
            window_ended_at=None,
        )

    freshness_seconds = max(
        0.0, (now - observation.window_ended_at.astimezone(UTC)).total_seconds()
    )
    success_rate = (
        (observation.success_count / observation.sample_count) * 100
        if observation.sample_count > 0
        else None
    )
    latency_target = 1200.0
    if freshness_seconds > observation.stale_after_seconds:
        status = "breached"
        rationale = "Telemetry freshness exceeded the configured stale threshold."
        objective_kind = "freshness_seconds"
        objective_target = float(observation.stale_after_seconds)
        observed_value = freshness_seconds
    elif observation.latency_p95_ms > latency_target:
        status = "breached" if observation.release_blocking else "degraded"
        rationale = "Latency p95 exceeded the control-plane threshold."
        objective_kind = "latency_p95_ms"
        objective_target = latency_target
        observed_value = observation.latency_p95_ms
    elif success_rate is not None and success_rate < 99.0:
        status = "breached" if observation.release_blocking else "degraded"
        rationale = "Success rate dropped below the expected operator reliability threshold."
        objective_kind = "success_rate"
        objective_target = 99.0
        observed_value = round(success_rate, 2)
    else:
        status = "healthy"
        rationale = "Latest observation is within freshness, latency, and success-rate thresholds."
        objective_kind = "freshness_seconds"
        objective_target = float(observation.stale_after_seconds)
        observed_value = freshness_seconds

    return EvaluationResult(
        service_name=service_name,
        objective_kind=objective_kind,
        objective_target=objective_target,
        observed_value=observed_value,
        status=status,
        breach_count=0 if status == "healthy" else 1,
        supporting_observation_ids=[observation.observation_id],
        rationale=rationale,
        release_blocking=observation.release_blocking,
        alert_severity=observation.alert_severity,
        slo_id=observation.slo_id,
        window_started_at=isoformat_z(observation.window_started_at),
        window_ended_at=isoformat_z(observation.window_ended_at),
    )


class ControlPlaneRuntime:
    def __init__(self, repository: ControlPlaneRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    def build_analytics_summary(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
    ) -> dict[str, Any]:
        now = utc_now()
        latest = self.repository.list_latest_telemetry_by_service(country_code=country_code)
        service_name = "admin_control_plane"
        admin_observation = latest.get(service_name)
        evaluation = evaluate_observation(admin_observation, now=now, service_name=service_name)
        healthy_records = 1 if evaluation.status == "healthy" else 0
        degraded_records = 1 if evaluation.status in {"degraded", "breached"} else 0
        empty_records = 1 if evaluation.status == "unavailable" else 0
        last_recorded_at = admin_observation.window_ended_at if admin_observation else None
        health_state = "current" if healthy_records else "degraded" if degraded_records else "empty"
        provenance = [
            {
                "citation_id": f"{service_name}-telemetry-window",
                "source_service": service_name,
                "entity_type": "telemetry_window",
                "record_count": 1 if admin_observation else 0,
                "last_recorded_at": isoformat_z(last_recorded_at),
                "coverage_state": (
                    "current"
                    if evaluation.status == "healthy"
                    else "empty"
                    if evaluation.status == "unavailable"
                    else "degraded"
                ),
                "note": evaluation.rationale,
            }
        ]
        return {
            "schema_version": self.settings.public_schema_version,
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "channel": "api",
            "service_name": "admin_control_plane",
            "slo_id": None,
            "alert_severity": "warning" if degraded_records or empty_records else "none",
            "audit_event_id": 0,
            "generated_at": isoformat_z(now),
            "total_records": 1,
            "healthy_records": healthy_records,
            "degraded_records": degraded_records,
            "empty_records": empty_records,
            "health_state": health_state,
            "last_recorded_at": isoformat_z(last_recorded_at),
            "provenance": provenance,
        }

    def build_analytics_snapshot(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
    ) -> dict[str, Any]:
        now = utc_now()
        latest = self.repository.list_latest_telemetry_by_service(country_code=country_code)
        summary = self.build_analytics_summary(
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
        )
        stale_services = []
        for service_name in ADMIN_SERVICES:
            evaluation = evaluate_observation(
                latest.get(service_name), now=now, service_name=service_name
            )
            if evaluation.status != "healthy":
                stale_services.append(service_name)
        window_started_at = min(
            (
                latest[service_name].window_started_at
                for service_name in latest
                if latest[service_name] is not None
            ),
            default=now,
        )
        window_ended_at = max(
            (
                latest[service_name].window_ended_at
                for service_name in latest
                if latest[service_name] is not None
            ),
            default=now,
        )
        return {
            "schema_version": self.settings.public_schema_version,
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "channel": "api",
            "service_name": "admin_control_plane",
            "slo_id": None,
            "alert_severity": summary["alert_severity"],
            "audit_event_id": 0,
            "generated_at": isoformat_z(now),
            "window_started_at": isoformat_z(window_started_at),
            "window_ended_at": isoformat_z(window_ended_at),
            "summaries": [summary],
            "provenance": summary["provenance"],
            "stale_services": stale_services,
        }

    def build_alert_collection(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
    ) -> dict[str, Any]:
        now = utc_now()
        latest = self.repository.list_latest_telemetry_by_service(country_code=country_code)
        items = []
        severities = []
        for service_name in ADMIN_SERVICES:
            observation = latest.get(service_name)
            evaluation = evaluate_observation(observation, now=now, service_name=service_name)
            if evaluation.status == "healthy":
                continue
            severities.append(evaluation.alert_severity or "warning")
            items.append(
                {
                    "schema_version": self.settings.public_schema_version,
                    "request_id": request_id,
                    "actor_id": actor_id,
                    "country_code": country_code,
                    "channel": "api",
                    "service_name": service_name,
                    "slo_id": evaluation.slo_id,
                    "alert_severity": evaluation.alert_severity,
                    "audit_event_id": observation.audit_event_id if observation else 0,
                    "objective_kind": evaluation.objective_kind,
                    "objective_target": evaluation.objective_target,
                    "observed_value": evaluation.observed_value,
                    "status": evaluation.status,
                    "breach_count": evaluation.breach_count,
                    "window_started_at": evaluation.window_started_at,
                    "window_ended_at": evaluation.window_ended_at,
                    "supporting_observation_ids": evaluation.supporting_observation_ids,
                    "rationale": evaluation.rationale,
                    "evaluated_at": isoformat_z(now),
                }
            )
        if not items:
            admin_observation = latest.get("admin_control_plane")
            items.append(
                {
                    "schema_version": self.settings.public_schema_version,
                    "request_id": request_id,
                    "actor_id": actor_id,
                    "country_code": country_code,
                    "channel": "api",
                    "service_name": "admin_control_plane",
                    "slo_id": admin_observation.slo_id if admin_observation else None,
                    "alert_severity": "info",
                    "audit_event_id": admin_observation.audit_event_id if admin_observation else 0,
                    "objective_kind": "freshness_seconds",
                    "objective_target": float(
                        admin_observation.stale_after_seconds if admin_observation else 300
                    ),
                    "observed_value": 0.0,
                    "status": "healthy",
                    "breach_count": 0,
                    "window_started_at": isoformat_z(
                        admin_observation.window_started_at if admin_observation else now
                    ),
                    "window_ended_at": isoformat_z(
                        admin_observation.window_ended_at if admin_observation else now
                    ),
                    "supporting_observation_ids": (
                        [admin_observation.observation_id] if admin_observation else []
                    ),
                    "rationale": "No degraded or breached control-plane alerts are active.",
                    "evaluated_at": isoformat_z(now),
                }
            )
        severity = "warning"
        if "critical" in severities:
            severity = "critical"
        elif not severities:
            severity = "info"
        return {
            "schema_version": self.settings.public_schema_version,
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "channel": "api",
            "service_name": "admin_control_plane",
            "slo_id": None,
            "alert_severity": severity,
            "audit_event_id": 0,
            "generated_at": isoformat_z(now),
            "items": items,
        }

    def build_rollout_collection(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
    ) -> dict[str, Any]:
        now = utc_now()
        items = [
            self.serialize_rollout_state(record)
            for record in self.repository.list_current_rollout_states(country_code=country_code)
        ]
        if not items:
            items = [
                {
                    "schema_version": self.settings.public_schema_version,
                    "request_id": request_id,
                    "actor_id": actor_id,
                    "country_code": country_code,
                    "channel": "api",
                    "service_name": "rollout_control",
                    "slo_id": None,
                    "alert_severity": None,
                    "audit_event_id": 0,
                    "actor_role": "admin",
                    "scope_key": f"{country_code.lower()}-default",
                    "state": "active",
                    "previous_state": None,
                    "intent": "resume",
                    "reason_code": "default_active",
                    "reason_detail": "No explicit rollout controls have been applied for this scope.",
                    "limited_release_percent": None,
                    "changed_at": isoformat_z(now),
                }
            ]
        return {
            "schema_version": self.settings.public_schema_version,
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "channel": "api",
            "service_name": "rollout_control",
            "slo_id": None,
            "alert_severity": None,
            "audit_event_id": 0,
            "generated_at": isoformat_z(now),
            "items": items,
        }

    def build_release_readiness(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
    ) -> dict[str, Any]:
        now = utc_now()
        latest = self.repository.list_latest_telemetry_by_service(country_code=country_code)
        rollout_states = self.build_rollout_collection(
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
        )["items"]
        slo_evaluations = self.build_alert_collection(
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
        )["items"]
        blocking_reasons: list[str] = []
        statuses = []
        for service_name in ADMIN_SERVICES:
            evaluation = evaluate_observation(latest.get(service_name), now=now, service_name=service_name)
            statuses.append(evaluation.status)
            if evaluation.status in {"breached", "unavailable"} and evaluation.release_blocking:
                blocking_reasons.append(
                    f"{service_name}:{evaluation.objective_kind}:{evaluation.status}"
                )
        for state in rollout_states:
            if state["state"] in {"frozen", "hold"}:
                blocking_reasons.append(
                    f"{state['service_name']}:{state['scope_key']}:{state['state']}"
                )
        readiness_status = "ready"
        if blocking_reasons:
            readiness_status = "blocked"
        elif any(status in {"degraded", "breached", "unavailable"} for status in statuses):
            readiness_status = "degraded"
        telemetry_freshness_state = "healthy"
        if any(status == "breached" for status in statuses):
            telemetry_freshness_state = "breached"
        elif any(status == "degraded" for status in statuses):
            telemetry_freshness_state = "degraded"
        elif any(status == "unavailable" for status in statuses):
            telemetry_freshness_state = "unavailable"
        return {
            "schema_version": self.settings.public_schema_version,
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "channel": "api",
            "service_name": "rollout_control",
            "slo_id": None,
            "alert_severity": "critical" if readiness_status == "blocked" else "warning",
            "audit_event_id": 0,
            "generated_at": isoformat_z(now),
            "readiness_status": readiness_status,
            "blocking_reasons": blocking_reasons,
            "rollout_states": rollout_states,
            "slo_evaluations": slo_evaluations,
            "telemetry_freshness_state": telemetry_freshness_state,
        }

    def build_admin_audit_projection(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
        events: list[AuditEvent],
    ) -> dict[str, Any]:
        items = []
        for event in events:
            payload_country = event.payload.get("country_code") if isinstance(event.payload, dict) else None
            if payload_country not in {None, country_code}:
                continue
            items.append(
                {
                    "audit_event_id": event.id,
                    "request_id": event.request_id,
                    "actor_id": event.actor_id,
                    "event_type": event.event_type,
                    "command_name": event.command_name,
                    "status": event.status,
                    "reason_code": event.reason_code,
                    "schema_version": event.schema_version,
                    "idempotency_key": event.idempotency_key,
                    "country_code": payload_country or country_code,
                    "payload": event.payload,
                    "created_at": isoformat_z(event.created_at),
                }
            )
        return {
            "request_id": request_id,
            "actor_id": actor_id,
            "country_code": country_code,
            "items": items,
        }

    def serialize_rollout_state(self, record: RolloutStateRecord) -> dict[str, Any]:
        return {
            "schema_version": record.schema_version,
            "request_id": record.request_id,
            "actor_id": record.actor_id,
            "country_code": record.country_code,
            "channel": record.channel,
            "service_name": record.service_name,
            "slo_id": record.slo_id,
            "alert_severity": record.alert_severity,
            "audit_event_id": record.audit_event_id,
            "actor_role": record.actor_role,
            "scope_key": record.scope_key,
            "state": record.state,
            "previous_state": record.previous_state,
            "intent": record.intent,
            "reason_code": record.reason_code,
            "reason_detail": record.reason_detail,
            "limited_release_percent": record.limited_release_percent,
            "changed_at": isoformat_z(record.changed_at),
        }

    def serialize_telemetry_record(self, record: TelemetryObservationRecord) -> dict[str, Any]:
        return {
            "schema_version": record.schema_version,
            "request_id": record.request_id,
            "actor_id": record.actor_id,
            "country_code": record.country_code,
            "channel": record.channel,
            "service_name": record.service_name,
            "slo_id": record.slo_id,
            "alert_severity": record.alert_severity,
            "audit_event_id": record.audit_event_id,
            "idempotency_key": record.idempotency_key,
            "observation_id": record.observation_id,
            "source_kind": record.source_kind,
            "window_started_at": isoformat_z(record.window_started_at),
            "window_ended_at": isoformat_z(record.window_ended_at),
            "success_count": record.success_count,
            "error_count": record.error_count,
            "sample_count": record.sample_count,
            "latency_p95_ms": record.latency_p95_ms,
            "stale_after_seconds": record.stale_after_seconds,
            "release_blocking": record.release_blocking,
            "note": record.note,
            "ingested_at": isoformat_z(record.ingested_at),
        }
