from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.repositories.traceability import TraceabilityRepository
from app.services.commands.handlers import _consignment_to_payload, _traceability_event_to_payload

router = APIRouter(prefix="/api/v1/traceability", tags=["traceability"])


@router.get("/consignments/{consignment_id}")
def get_consignment_detail(
    consignment_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = TraceabilityRepository(db_session)
    consignment = repository.get_consignment_for_actor(
        consignment_id=consignment_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if consignment is None:
        raise HTTPException(status_code=404, detail="consignment_not_found")
    schema_version = request.app.state.settings.public_schema_version
    events = repository.list_events(consignment_id=consignment_id)
    return {
        "schema_version": schema_version,
        "consignment": _consignment_to_payload(consignment, schema_version),
        "timeline": [_traceability_event_to_payload(item, schema_version) for item in events],
    }


@router.get("/consignments/{consignment_id}/timeline")
def get_consignment_timeline(
    consignment_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = TraceabilityRepository(db_session)
    consignment = repository.get_consignment_for_actor(
        consignment_id=consignment_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if consignment is None:
        raise HTTPException(status_code=404, detail="consignment_not_found")
    schema_version = request.app.state.settings.public_schema_version
    events = repository.list_events(consignment_id=consignment_id)
    return {
        "schema_version": schema_version,
        "consignment_id": consignment_id,
        "items": [_traceability_event_to_payload(item, schema_version) for item in events],
    }
