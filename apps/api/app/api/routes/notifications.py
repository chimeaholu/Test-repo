from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.models.audit import AuditEvent
from app.db.repositories.ledger import EscrowRepository

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


@router.get("/center")
def notification_center(
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = authenticate_request(request, settings, session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    escrow_repository = EscrowRepository(session)
    items: list[dict[str, Any]] = []
    for escrow in escrow_repository.list_escrows_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    ):
        for timeline_item in escrow_repository.list_timeline(escrow_id=escrow.escrow_id):
            payload = timeline_item.notification_payload or {}
            if payload and payload.get("recipient_actor_id") not in {None, auth_context.actor_subject}:
                continue
            items.append(
                {
                    "notification_id": str(payload.get("notification_id") or f"timeline-{escrow.escrow_id}-{timeline_item.transition}"),
                    "kind": "settlement_update" if payload else "workflow_state",
                    "title": f"Escrow {timeline_item.state.replace('_', ' ')}",
                    "body": timeline_item.note or f"{escrow.escrow_id} moved to {timeline_item.state}.",
                    "delivery_state": str(payload.get("delivery_state") or "sent"),
                    "route": "/app/payments/wallet",
                    "ack_state": "unread" if timeline_item.state == "partner_pending" else "read",
                    "created_at": _isoformat(timeline_item.created_at),
                    "metadata": {
                        "escrow_id": escrow.escrow_id,
                        "transition": timeline_item.transition,
                        "fallback_channel": payload.get("fallback_channel"),
                        "fallback_reason": payload.get("fallback_reason"),
                    },
                }
            )

    statement = (
        select(AuditEvent)
        .where(AuditEvent.actor_id == auth_context.actor_subject)
        .order_by(desc(AuditEvent.created_at), desc(AuditEvent.id))
        .limit(10)
    )
    for event in session.execute(statement).scalars().all():
        items.append(
            {
                "notification_id": f"audit-{event.id}",
                "kind": "system_alert",
                "title": event.event_type.replace(".", " "),
                "body": event.reason_code or event.status,
                "delivery_state": "sent",
                "route": "/app/profile",
                "ack_state": "read",
                "created_at": _isoformat(event.created_at),
                "metadata": {
                    "request_id": event.request_id,
                    "status": event.status,
                },
            }
        )

    items.sort(key=lambda item: item["created_at"] or "", reverse=True)
    return {
        "generated_at": _isoformat(datetime.now(tz=UTC)),
        "items": items[:20],
        "unread_count": sum(1 for item in items if item["ack_state"] == "unread"),
    }
