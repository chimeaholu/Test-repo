from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import (
    get_active_settings,
    get_correlation_id,
    get_session,
)
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.repositories.audit import AuditRepository
from app.services.commands.bus import CommandBus
from app.services.commands.contracts import CommandEnvelope, CommandResultEnvelope
from app.services.commands.errors import CommandRejectedError

router = APIRouter(prefix="/api/v1/workflow", tags=["workflow"])


@router.post("/commands", response_model=CommandResultEnvelope)
def dispatch_command(
    envelope: CommandEnvelope,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    correlation_id: str = Depends(get_correlation_id),
) -> CommandResultEnvelope:
    auth_context = authenticate_request(request, settings, session)
    audit_repository = AuditRepository(session)
    bus = CommandBus(
        session=session,
        telemetry=request.app.state.telemetry,
        correlation_id=correlation_id,
        settings=settings,
    )
    started_at = perf_counter()

    if auth_context is None:
        audit_event = audit_repository.record_unauthorized_attempt(
            request_id=str(envelope.metadata.request_id),
            command_name=envelope.command_name,
            idempotency_key=envelope.metadata.idempotency_key,
            schema_version=envelope.metadata.schema_version,
            payload=envelope.payload,
            correlation_id=correlation_id,
        )
        session.commit()
        request.app.state.telemetry.record_command(
            command_name=envelope.command_name,
            status="unauthorized",
            duration_ms=(perf_counter() - started_at) * 1000,
            correlation_id=correlation_id,
        )
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "unauthorized_mutation",
                "audit_event_id": str(audit_event.id),
            },
        )

    try:
        result = bus.dispatch(envelope, auth_context)
        session.commit()
    except CommandRejectedError as exc:
        session.commit()
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "error_code": exc.error_code,
                "audit_event_id": exc.payload.get("audit_event_id"),
            },
        ) from exc
    except Exception:
        session.rollback()
        raise

    request.app.state.telemetry.record_command(
        command_name=envelope.command_name,
        status=result.status,
        duration_ms=(perf_counter() - started_at) * 1000,
        correlation_id=correlation_id,
    )
    if envelope.command_name in {"market.listings.publish", "market.listings.unpublish"}:
        listing = result.result.get("listing", {})
        if isinstance(listing, dict):
            request.app.state.telemetry.record_listing_publish_transition(
                listing_id=str(listing.get("listing_id", "")),
                transition=envelope.command_name.rsplit(".", 1)[-1],
                revision_count=int(listing.get("revision_count", 0)),
                correlation_id=correlation_id,
            )
    return result
