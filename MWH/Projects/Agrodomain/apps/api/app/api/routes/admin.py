from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.demo import DEMO_TENANT_LABEL, is_demo_actor_id
from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.climate import ClimateAlert
from app.db.models.marketplace import Listing
from app.db.models.platform import IdentitySessionRecord

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

RolloutEndpoint = Literal["freeze", "canary", "promote", "rollback"]

ROLLOUT_STATE_BY_ENDPOINT: dict[RolloutEndpoint, str] = {
    "freeze": "frozen",
    "canary": "limited_release",
    "promote": "live",
    "rollback": "rolled_back",
}


class RolloutMutationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    actor_id: str = Field(min_length=1, max_length=64)
    actor_role: str = Field(min_length=1, max_length=32)
    alert_severity: str = Field(min_length=1, max_length=32)
    audit_event_id: int = Field(ge=0)
    channel: str = Field(min_length=1, max_length=16)
    country_code: str = Field(min_length=2, max_length=2)
    idempotency_key: str = Field(min_length=8, max_length=128)
    intent: str = Field(min_length=1, max_length=32)
    limited_release_percent: int | None = Field(default=None, ge=1, le=100)
    reason_code: str = Field(min_length=1, max_length=64)
    reason_detail: str = Field(min_length=8, max_length=255)
    request_id: str = Field(min_length=8, max_length=64)
    schema_version: str = Field(min_length=1, max_length=32)
    scope_key: str = Field(min_length=1, max_length=64)
    service_name: str = Field(min_length=1, max_length=64)
    slo_id: str = Field(min_length=1, max_length=64)


def _coerce_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return _coerce_utc(value).isoformat()


def _require_admin(
    request: Request,
    settings: Settings,
    db_session: Session,
) -> AuthContext:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.role != "admin":
        raise HTTPException(status_code=403, detail="missing_operator_scope")
    return auth_context


def _outbox_depth(db_session: Session) -> int:
    return db_session.execute(
        select(func.count()).select_from(OutboxMessage).where(OutboxMessage.published_at.is_(None))
    ).scalar_one()


def _latest_activity_at(db_session: Session) -> datetime | None:
    candidates: list[datetime | None] = [
        db_session.execute(select(func.max(IdentitySessionRecord.last_seen_at))).scalar_one(),
        db_session.execute(select(func.max(AuditEvent.created_at))).scalar_one(),
        db_session.execute(select(func.max(ClimateAlert.created_at))).scalar_one(),
        db_session.execute(select(func.max(Listing.updated_at))).scalar_one(),
    ]
    normalized: list[datetime] = [_coerce_utc(value) for value in candidates if value is not None]
    return max(normalized) if normalized else None


def _segregated_counts(db_session: Session) -> dict[str, int]:
    listing_actor_ids = db_session.execute(select(Listing.actor_id)).scalars().all()
    alert_actor_ids = db_session.execute(select(ClimateAlert.actor_id)).scalars().all()
    session_actor_ids = db_session.execute(
        select(IdentitySessionRecord.actor_id).where(IdentitySessionRecord.revoked_at.is_(None))
    ).scalars().all()

    demo_listings = sum(1 for actor_id in listing_actor_ids if is_demo_actor_id(actor_id))
    demo_alerts = sum(1 for actor_id in alert_actor_ids if is_demo_actor_id(actor_id))
    demo_sessions = sum(1 for actor_id in session_actor_ids if is_demo_actor_id(actor_id))
    return {
        "operational_listings": len(listing_actor_ids) - demo_listings,
        "demo_listings": demo_listings,
        "operational_alerts": len(alert_actor_ids) - demo_alerts,
        "demo_alerts": demo_alerts,
        "operational_sessions": len(session_actor_ids) - demo_sessions,
        "demo_sessions": demo_sessions,
    }


def _freshness_state(last_recorded_at: datetime | None) -> str:
    if last_recorded_at is None:
        return "missing"
    age = datetime.now(UTC) - _coerce_utc(last_recorded_at)
    if age <= timedelta(hours=6):
        return "fresh"
    if age <= timedelta(hours=24):
        return "stale"
    return "expired"


@router.get("/analytics/health")
def admin_analytics_health(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)

    counts = _segregated_counts(db_session)
    listing_count = counts["operational_listings"]
    alert_count = counts["operational_alerts"]
    active_session_count = counts["operational_sessions"]
    queue_depth = _outbox_depth(db_session)
    last_recorded_at = _latest_activity_at(db_session)
    freshness_state = _freshness_state(last_recorded_at)

    degraded_records = int(queue_depth > 0) + int(freshness_state in {"stale", "expired"})
    empty_records = int(listing_count == 0) + int(active_session_count == 0)
    healthy_records = 4 - degraded_records - empty_records

    health_state = "healthy"
    if freshness_state == "expired" or queue_depth > 10:
        health_state = "critical"
    elif degraded_records > 0 or empty_records > 0:
        health_state = "degraded"

    return {
        "service_name": "admin_control_plane",
        "health_state": health_state,
        "healthy_records": max(healthy_records, 0),
        "degraded_records": degraded_records,
        "empty_records": empty_records,
        "last_recorded_at": _isoformat(last_recorded_at),
        "active_signals": {
            "active_sessions": active_session_count,
            "alerts": alert_count,
            "listings": listing_count,
            "outbox_queue_depth": queue_depth,
            "telemetry_freshness_state": freshness_state,
        },
        "demo_signals": {
            "tenant_label": DEMO_TENANT_LABEL,
            "active_sessions": counts["demo_sessions"],
            "alerts": counts["demo_alerts"],
            "listings": counts["demo_listings"],
        },
        "segregation_mode": "shared_environment_demo_tenant",
    }


@router.get("/observability/alerts")
def admin_observability_alerts(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)

    items: list[dict[str, object]] = []
    queue_depth = _outbox_depth(db_session)
    last_recorded_at = _latest_activity_at(db_session)
    freshness_state = _freshness_state(last_recorded_at)
    active_session_count = db_session.execute(
        select(func.count()).select_from(IdentitySessionRecord).where(IdentitySessionRecord.revoked_at.is_(None))
    ).scalar_one()

    if queue_depth > 0:
        items.append(
            {
                "service_name": "audit_outbox",
                "status": "open",
                "alert_severity": "warning" if queue_depth <= 10 else "critical",
                "rationale": f"{queue_depth} unpublished outbox message(s) are waiting for delivery.",
            }
        )
    if freshness_state in {"stale", "expired", "missing"}:
        items.append(
            {
                "service_name": "telemetry_freshness",
                "status": "open",
                "alert_severity": "warning" if freshness_state == "stale" else "critical",
                "rationale": f"Admin telemetry freshness is {freshness_state}.",
            }
        )
    if active_session_count == 0:
        items.append(
            {
                "service_name": "identity_sessions",
                "status": "open",
                "alert_severity": "warning",
                "rationale": "No active authenticated sessions are visible in the runtime.",
            }
        )
    if not items:
        items.append(
            {
                "service_name": "admin_control_plane",
                "status": "healthy",
                "alert_severity": None,
                "rationale": "No active observability alerts are open.",
            }
        )

    return {"items": items}


@router.get("/rollouts/status")
def admin_rollout_status(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)

    events = db_session.execute(
        select(AuditEvent)
        .where(AuditEvent.event_type == "admin.rollout.transition")
        .order_by(AuditEvent.id.desc())
    ).scalars().all()

    latest_by_scope: dict[tuple[str, str], dict[str, object]] = {}
    for event in events:
        payload = event.payload or {}
        service_name = str(payload.get("service_name") or "admin_control_plane")
        scope_key = str(payload.get("scope_key") or "global")
        key = (service_name, scope_key)
        if key in latest_by_scope:
            continue
        latest_by_scope[key] = {
            "changed_at": _isoformat(event.created_at),
            "reason_code": event.reason_code or str(payload.get("reason_code") or "operator_review"),
            "scope_key": scope_key,
            "service_name": service_name,
            "state": str(payload.get("state") or "unknown"),
        }

    return {"items": list(latest_by_scope.values())}


@router.get("/release-readiness")
def admin_release_readiness(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)

    blocking_reasons: list[str] = []
    queue_depth = _outbox_depth(db_session)
    last_recorded_at = _latest_activity_at(db_session)
    freshness_state = _freshness_state(last_recorded_at)
    rollout_events = db_session.execute(
        select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type == "admin.rollout.transition")
    ).scalar_one()

    if queue_depth > 0:
        blocking_reasons.append("Outbox queue depth is non-zero; delivery backlog must be cleared.")
    if freshness_state in {"expired", "missing"}:
        blocking_reasons.append("Telemetry freshness is not acceptable for release readiness.")
    if rollout_events == 0:
        blocking_reasons.append("No rollout-control audit transitions have been recorded yet.")

    readiness_status = "ready" if not blocking_reasons else "blocked"
    if readiness_status == "blocked" and freshness_state == "stale" and queue_depth == 0 and rollout_events > 0:
        readiness_status = "degraded"

    return {
        "readiness_status": readiness_status,
        "telemetry_freshness_state": freshness_state,
        "blocking_reasons": blocking_reasons,
    }


@router.post("/rollouts/{endpoint}")
def mutate_rollout_state(
    endpoint: RolloutEndpoint,
    payload: RolloutMutationRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_admin(request, settings, db_session)

    if payload.actor_id != auth_context.actor_subject or payload.actor_role != "admin":
        raise HTTPException(status_code=403, detail="missing_rollout_scope")
    if auth_context.country_code is not None and payload.country_code != auth_context.country_code:
        raise HTTPException(status_code=403, detail="country_scope_mismatch")
    if endpoint != "canary" and payload.limited_release_percent is not None:
        raise HTTPException(status_code=422, detail="limited_release_percent_not_allowed")
    if endpoint == "canary" and payload.limited_release_percent is None:
        raise HTTPException(status_code=422, detail="limited_release_percent_required")

    existing = db_session.execute(
        select(AuditEvent).where(
            AuditEvent.event_type == "admin.rollout.transition",
            AuditEvent.idempotency_key == payload.idempotency_key,
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing_payload = existing.payload or {}
        return {
            "audit_event_id": existing.id,
            "changed_at": _isoformat(existing.created_at),
            "reason_code": existing.reason_code,
            "scope_key": existing_payload.get("scope_key", payload.scope_key),
            "service_name": existing_payload.get("service_name", payload.service_name),
            "state": existing_payload.get("state", ROLLOUT_STATE_BY_ENDPOINT[endpoint]),
            "status": existing.status,
        }

    event = AuditEvent(
        request_id=payload.request_id,
        actor_id=payload.actor_id,
        event_type="admin.rollout.transition",
        command_name=f"admin.rollout.{endpoint}",
        status="accepted",
        reason_code=payload.reason_code,
        schema_version=payload.schema_version[:16],
        idempotency_key=payload.idempotency_key,
        correlation_id=request.state.correlation_id,
        payload={
            "alert_severity": payload.alert_severity,
            "channel": payload.channel,
            "country_code": payload.country_code,
            "intent": payload.intent,
            "limited_release_percent": payload.limited_release_percent,
            "reason_detail": payload.reason_detail,
            "scope_key": payload.scope_key,
            "service_name": payload.service_name,
            "slo_id": payload.slo_id,
            "state": ROLLOUT_STATE_BY_ENDPOINT[endpoint],
        },
    )
    db_session.add(event)
    db_session.commit()

    return {
        "audit_event_id": event.id,
        "changed_at": _isoformat(event.created_at),
        "reason_code": event.reason_code,
        "scope_key": payload.scope_key,
        "service_name": payload.service_name,
        "state": ROLLOUT_STATE_BY_ENDPOINT[endpoint],
        "status": event.status,
    }
