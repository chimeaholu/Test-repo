from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_contract_headers, validate_contract_payload
from app.core.shared_runtime_config import (
    RuntimeEnvironment,
    resolve_feature_flag,
    resolve_rollout_policy,
    validate_runtime_country_access,
)
from app.db.models.audit import AuditEvent
from app.db.repositories.audit import AuditRepository
from app.db.repositories.control_plane import ControlPlaneRepository
from app.db.repositories.workflow import WorkflowRepository
from app.modules.analytics.runtime import (
    ControlPlaneRuntime,
    isoformat_z,
    parse_iso_timestamp,
    utc_now,
)
from app.services.outbox import OutboxService

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

READ_ROLES = {"admin", "finance_ops", "compliance"}
MUTATION_ROLES = {"admin", "finance_ops"}
READ_SCOPE = "admin.observability"
ROLLOUT_SCOPE = "admin.rollout"


def _require_auth(
    request: Request,
    settings: Settings,
    session: Session,
    *,
    allowed_roles: set[str],
) -> AuthContext:
    auth_context = authenticate_request(request, settings, session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="forbidden")
    return auth_context


def _session_scope_ids(session: Session, actor_id: str) -> set[str]:
    from app.db.repositories.identity import IdentityRepository

    identity_repository = IdentityRepository(session)
    session_row = identity_repository.get_session_by_actor(actor_id)
    if session_row is None:
        return set()
    return set(session_row.consent_scope_ids or [])


def _require_scope(session: Session, auth_context: AuthContext, scope_id: str) -> None:
    if auth_context.role == "admin":
        return
    scope_ids = _session_scope_ids(session, auth_context.actor_subject)
    if scope_id not in scope_ids:
        raise HTTPException(
            status_code=403,
            detail={"error_code": "missing_operator_scope", "scope_id": scope_id},
        )


def _resolve_country_scope(auth_context: AuthContext, country_code: str | None) -> str:
    requested = country_code or auth_context.country_code or "GH"
    if auth_context.role != "admin" and auth_context.country_code not in {None, requested}:
        raise HTTPException(
            status_code=403,
            detail={"error_code": "missing_country_scope", "country_code": requested},
        )
    return requested


def _runtime_country_guard(settings: Settings, country_code: str) -> None:
    try:
        validate_runtime_country_access(
            environment=settings.environment,
            country_code=country_code,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error_code": "country_not_supported", "country_code": country_code},
        ) from exc


def _runtime(session: Session, settings: Settings) -> tuple[ControlPlaneRepository, ControlPlaneRuntime]:
    repository = ControlPlaneRepository(session)
    return repository, ControlPlaneRuntime(repository, settings)


def _apply_headers(response: Response, contract_id: str) -> None:
    for key, value in get_contract_headers(contract_id).items():
        response.headers[key] = value


def _load_request_id(request: Request, fallback: str) -> str:
    return getattr(request.state, "request_id", fallback)


def _record_rollout_state(
    *,
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session,
    settings: Settings,
    action_name: str,
    expected_intent: str,
    resulting_state: str,
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=MUTATION_ROLES)
    _require_scope(session, auth_context, ROLLOUT_SCOPE)
    if not settings.admin_api_enabled:
        raise HTTPException(status_code=503, detail={"error_code": "admin_api_disabled"})
    validate_contract_payload("observability.rollout_control_input", payload)
    if payload["intent"] != expected_intent:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "invalid_rollout_payload",
                "expected_intent": expected_intent,
                "received_intent": payload["intent"],
            },
        )
    if payload.get("actor_id") != auth_context.actor_subject:
        raise HTTPException(status_code=403, detail={"error_code": "missing_rollout_scope"})

    target_country = _resolve_country_scope(auth_context, payload.get("country_code"))
    _runtime_country_guard(settings, target_country)
    rollout_policy = resolve_rollout_policy(
        environment=settings.environment,
        policy_key="admin.control-plane.default",
    )
    if target_country not in rollout_policy["country_codes"]:
        raise HTTPException(
            status_code=422,
            detail={"error_code": "country_not_supported", "country_code": target_country},
        )
    workflow_repository = WorkflowRepository(session)
    receipt = workflow_repository.get_receipt(payload["idempotency_key"])
    contract_id = "observability.rollout_status"
    if receipt is not None:
        _apply_headers(response, contract_id)
        response.headers["X-Agrodomain-Replayed"] = "true"
        return receipt.response_body

    repository, runtime = _runtime(session, settings)
    current_state = repository.get_current_rollout_state(
        country_code=target_country,
        service_name=payload["service_name"],
        scope_key=payload["scope_key"],
    )
    changed_at = utc_now()
    audit_repository = AuditRepository(session)
    audit_event = audit_repository.record_event(
        request_id=payload["request_id"],
        actor_id=auth_context.actor_subject,
        event_type="admin.rollout.state_changed",
        command_name=f"admin.rollouts.{action_name}",
        status="accepted",
        reason_code=payload["reason_code"],
        schema_version=payload["schema_version"],
        idempotency_key=payload["idempotency_key"],
        payload={
            **payload,
            "country_code": target_country,
            "resulting_state": resulting_state,
            "action_name": action_name,
        },
        correlation_id=_load_request_id(request, payload["request_id"]),
    )
    record = repository.create_rollout_state(
        request_id=payload["request_id"],
        idempotency_key=payload["idempotency_key"],
        actor_id=auth_context.actor_subject,
        actor_role=payload["actor_role"],
        country_code=target_country,
        channel=payload["channel"],
        service_name=payload["service_name"],
        slo_id=payload["slo_id"],
        alert_severity=payload["alert_severity"],
        audit_event_id=audit_event.id,
        scope_key=payload["scope_key"],
        state=resulting_state,
        previous_state=current_state.state if current_state else "active",
        intent=payload["intent"],
        reason_code=payload["reason_code"],
        reason_detail=payload["reason_detail"],
        limited_release_percent=payload.get("limited_release_percent"),
        schema_version=payload["schema_version"],
        changed_at=changed_at,
    )
    result = runtime.serialize_rollout_state(record)
    validate_contract_payload(contract_id, result)
    workflow_repository.create_receipt(
        idempotency_key=payload["idempotency_key"],
        request_id=payload["request_id"],
        actor_id=auth_context.actor_subject,
        command_name=f"admin.rollouts.{action_name}",
        status="accepted",
        response_code="accepted",
        response_body=result,
    )
    OutboxService(session).enqueue(
        aggregate_type="rollout_control",
        aggregate_id=f"{record.service_name}:{record.scope_key}",
        event_type=f"admin.rollouts.{action_name}",
        payload=result,
    )
    session.commit()
    _apply_headers(response, contract_id)
    response.headers["X-Agrodomain-Replayed"] = "false"
    return result


@router.get("/analytics/health")
def analytics_health(
    request: Request,
    response: Response,
    country_code: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _runtime_country_guard(settings, target_country)
    _, runtime = _runtime(session, settings)
    payload = runtime.build_analytics_summary(
        request_id=_load_request_id(request, "admin-analytics-health"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
    )
    validate_contract_payload("analytics.admin_service_level_summary", payload)
    _apply_headers(response, "analytics.admin_service_level_summary")
    return payload


@router.get("/analytics/snapshot")
def analytics_snapshot(
    request: Request,
    response: Response,
    country_code: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _runtime_country_guard(settings, target_country)
    _, runtime = _runtime(session, settings)
    payload = runtime.build_analytics_snapshot(
        request_id=_load_request_id(request, "admin-analytics-snapshot"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
    )
    validate_contract_payload("analytics.admin_analytics_snapshot", payload)
    _apply_headers(response, "analytics.admin_analytics_snapshot")
    return payload


@router.get("/observability/alerts")
def observability_alerts(
    request: Request,
    response: Response,
    country_code: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _runtime_country_guard(settings, target_country)
    _, runtime = _runtime(session, settings)
    payload = runtime.build_alert_collection(
        request_id=_load_request_id(request, "admin-observability-alerts"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
    )
    validate_contract_payload("observability.slo_evaluation_collection", payload)
    _apply_headers(response, "observability.slo_evaluation_collection")
    return payload


@router.get("/observability/telemetry/{observation_id}")
def get_telemetry_record(
    observation_id: str,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    repository, runtime = _runtime(session, settings)
    record = repository.get_telemetry_by_observation_id(observation_id)
    if record is None:
        raise HTTPException(status_code=404, detail="telemetry_observation_not_found")
    _resolve_country_scope(auth_context, record.country_code)
    payload = runtime.serialize_telemetry_record(record)
    validate_contract_payload("observability.telemetry_observation_record", payload)
    _apply_headers(response, "observability.telemetry_observation_record")
    return payload


@router.post("/observability/telemetry")
def ingest_telemetry(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=MUTATION_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    if not settings.telemetry_collection_enabled:
        raise HTTPException(
            status_code=503,
            detail={"error_code": "telemetry_collection_disabled"},
        )
    validate_contract_payload("observability.telemetry_observation_input", payload)
    if payload.get("actor_id") != auth_context.actor_subject:
        raise HTTPException(status_code=403, detail={"error_code": "missing_actor_scope"})

    target_country = _resolve_country_scope(auth_context, payload.get("country_code"))
    _runtime_country_guard(settings, target_country)
    notification_flag = resolve_feature_flag("worker.operator_notifications")
    notification_policy = resolve_rollout_policy(
        environment=cast(RuntimeEnvironment, settings.environment),
        policy_key=notification_flag["rollout_policy_key"] or "admin.control-plane.default",
    )
    if target_country not in notification_policy["country_codes"]:
        raise HTTPException(
            status_code=422,
            detail={"error_code": "country_not_supported", "country_code": target_country},
        )
    workflow_repository = WorkflowRepository(session)
    receipt = workflow_repository.get_receipt(str(payload["idempotency_key"]))
    contract_id = "observability.telemetry_observation_record"
    if receipt is not None:
        _apply_headers(response, contract_id)
        response.headers["X-Agrodomain-Replayed"] = "true"
        return receipt.response_body

    repository, runtime = _runtime(session, settings)
    ingested_at = utc_now()
    audit_repository = AuditRepository(session)
    audit_event = audit_repository.record_event(
        request_id=payload["request_id"],
        actor_id=auth_context.actor_subject,
        event_type="admin.telemetry.ingested",
        command_name="admin.telemetry.ingest",
        status="accepted",
        reason_code="telemetry_ingested",
        schema_version=payload["schema_version"],
        idempotency_key=payload["idempotency_key"],
        payload={**payload, "country_code": target_country},
        correlation_id=_load_request_id(request, payload["request_id"]),
    )
    record = repository.create_telemetry_observation(
        observation_id=payload["observation_id"],
        idempotency_key=payload["idempotency_key"],
        request_id=payload["request_id"],
        actor_id=auth_context.actor_subject,
        country_code=target_country,
        channel=payload["channel"],
        service_name=payload["service_name"],
        slo_id=payload["slo_id"],
        alert_severity=payload["alert_severity"],
        audit_event_id=audit_event.id,
        source_kind=payload["source_kind"],
        window_started_at=parse_iso_timestamp(payload["window_started_at"]),
        window_ended_at=parse_iso_timestamp(payload["window_ended_at"]),
        success_count=payload["success_count"],
        error_count=payload["error_count"],
        sample_count=payload["sample_count"],
        latency_p95_ms=payload["latency_p95_ms"],
        stale_after_seconds=payload["stale_after_seconds"],
        release_blocking=payload["release_blocking"],
        note=payload.get("note"),
        schema_version=payload["schema_version"],
        ingested_at=ingested_at,
    )
    result = runtime.serialize_telemetry_record(record)
    validate_contract_payload(contract_id, result)
    workflow_repository.create_receipt(
        idempotency_key=payload["idempotency_key"],
        request_id=payload["request_id"],
        actor_id=auth_context.actor_subject,
        command_name="admin.telemetry.ingest",
        status="accepted",
        response_code="accepted",
        response_body=result,
    )
    OutboxService(session).enqueue(
        aggregate_type="telemetry_observation",
        aggregate_id=record.observation_id,
        event_type="admin.telemetry.ingested",
        payload=result,
    )
    session.commit()
    response.status_code = status.HTTP_202_ACCEPTED
    _apply_headers(response, contract_id)
    response.headers["X-Agrodomain-Replayed"] = "false"
    return result


@router.get("/rollouts/status")
def rollout_status(
    request: Request,
    response: Response,
    country_code: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, ROLLOUT_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _runtime_country_guard(settings, target_country)
    _, runtime = _runtime(session, settings)
    payload = runtime.build_rollout_collection(
        request_id=_load_request_id(request, "admin-rollout-status"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
    )
    validate_contract_payload("observability.rollout_status_collection", payload)
    _apply_headers(response, "observability.rollout_status_collection")
    return payload


@router.post("/rollouts/freeze")
def rollout_freeze(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    return _record_rollout_state(
        payload=payload,
        request=request,
        response=response,
        session=session,
        settings=settings,
        action_name="freeze",
        expected_intent="freeze",
        resulting_state="frozen",
    )


@router.post("/rollouts/canary")
def rollout_canary(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    return _record_rollout_state(
        payload=payload,
        request=request,
        response=response,
        session=session,
        settings=settings,
        action_name="canary",
        expected_intent="limited_release",
        resulting_state="limited_release",
    )


@router.post("/rollouts/promote")
def rollout_promote(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    return _record_rollout_state(
        payload=payload,
        request=request,
        response=response,
        session=session,
        settings=settings,
        action_name="promote",
        expected_intent="resume",
        resulting_state="active",
    )


@router.post("/rollouts/rollback")
def rollout_rollback(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    return _record_rollout_state(
        payload=payload,
        request=request,
        response=response,
        session=session,
        settings=settings,
        action_name="rollback",
        expected_intent="freeze",
        resulting_state="frozen",
    )


@router.get("/release-readiness")
def release_readiness(
    request: Request,
    response: Response,
    country_code: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, ROLLOUT_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _, runtime = _runtime(session, settings)
    payload = runtime.build_release_readiness(
        request_id=_load_request_id(request, "admin-release-readiness"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
    )
    validate_contract_payload("observability.release_readiness_status", payload)
    _apply_headers(response, "observability.release_readiness_status")
    return payload


@router.get("/audit/events")
def admin_audit_events(
    request: Request,
    country_code: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _require_auth(request, settings, session, allowed_roles=READ_ROLES)
    _require_scope(session, auth_context, READ_SCOPE)
    target_country = _resolve_country_scope(auth_context, country_code)
    _, runtime = _runtime(session, settings)
    statement = (
        select(AuditEvent)
        .where(AuditEvent.event_type.like("admin.%"))
        .order_by(AuditEvent.id.desc())
        .limit(limit)
    )
    events = list(session.execute(statement).scalars().all())
    return runtime.build_admin_audit_projection(
        request_id=_load_request_id(request, "admin-audit-events"),
        actor_id=auth_context.actor_subject,
        country_code=target_country,
        events=events,
    )
