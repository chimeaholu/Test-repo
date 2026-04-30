from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.models.audit import AuditEvent

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/events")
def list_audit_events(
    request: Request,
    request_id: str | None = Query(default=None),
    idempotency_key: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    statement = select(AuditEvent).order_by(AuditEvent.id.asc())
    if request_id:
        statement = statement.where(AuditEvent.request_id == request_id)
    if idempotency_key:
        statement = statement.where(AuditEvent.idempotency_key == idempotency_key)

    items = []
    for event in db_session.execute(statement).scalars().all():
        if event.actor_id not in {None, auth_context.actor_subject}:
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
                "correlation_id": event.correlation_id,
                "payload": event.payload,
                "created_at": event.created_at.isoformat(),
            }
        )
    return {"items": items}
