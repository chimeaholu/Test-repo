from __future__ import annotations

from datetime import UTC, date, datetime
from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.transport import Shipment, ShipmentEvent, TransportLoad
from app.db.repositories.audit import AuditRepository
from app.db.repositories.transport import TransportRepository
from app.modules.transport.runtime import TransportRuntime
from app.services.commands.errors import CommandRejectedError

router = APIRouter(prefix="/api/v1/transport", tags=["transport"])


class TransportLoadCreateBody(BaseModel):
    origin_location: str
    destination_location: str
    commodity: str
    weight_tons: float
    vehicle_type_required: str
    pickup_date: date
    delivery_deadline: date
    price_offer: float
    price_currency: str = "GHS"


class LoadAssignBody(BaseModel):
    vehicle_info: dict[str, object] = Field(default_factory=dict)
    location_lat: float | None = None
    location_lng: float | None = None
    notes: str | None = None


class ShipmentEventBody(BaseModel):
    event_type: str
    location_lat: float | None = None
    location_lng: float | None = None
    notes: str | None = None


class ShipmentDeliverBody(BaseModel):
    proof_of_delivery_url: str
    location_lat: float | None = None
    location_lng: float | None = None
    notes: str | None = None


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat().replace("+00:00", "Z")


def _load_payload(repository: TransportRepository, load: TransportLoad) -> dict[str, object]:
    shipment = repository.get_shipment_for_load(load_id=load.load_id)
    return _load_payload_with_shipment(load=load, shipment=shipment)


def _load_payload_with_shipment(
    *, load: TransportLoad, shipment: Shipment | None
) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "load_id": load.load_id,
        "poster_actor_id": load.poster_actor_id,
        "country_code": load.country_code,
        "origin_location": load.origin_location,
        "destination_location": load.destination_location,
        "commodity": load.commodity,
        "weight_tons": load.weight_tons,
        "vehicle_type_required": load.vehicle_type_required,
        "pickup_date": load.pickup_date.isoformat(),
        "delivery_deadline": load.delivery_deadline.isoformat(),
        "price_offer": load.price_offer,
        "price_currency": load.price_currency,
        "status": load.status,
        "assigned_transporter_actor_id": load.assigned_transporter_actor_id,
        "shipment_id": shipment.shipment_id if shipment is not None else None,
        "created_at": _isoformat(load.created_at),
        "updated_at": _isoformat(load.updated_at),
    }


def _event_payload(event: ShipmentEvent) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "event_id": event.event_id,
        "shipment_id": event.shipment_id,
        "actor_id": event.actor_id,
        "event_type": event.event_type,
        "timestamp": _isoformat(event.event_at),
        "location_lat": event.location_lat,
        "location_lng": event.location_lng,
        "notes": event.notes,
    }


def _shipment_payload(
    repository: TransportRepository,
    shipment: Shipment,
) -> dict[str, object]:
    load = repository.get_load(load_id=shipment.load_id, country_code=shipment.country_code)
    if load is None:
        raise HTTPException(status_code=404, detail="transport_load_not_found")
    return {
        "schema_version": get_envelope_schema_version(),
        "shipment_id": shipment.shipment_id,
        "load_id": shipment.load_id,
        "poster_actor_id": load.poster_actor_id,
        "transporter_actor_id": shipment.transporter_actor_id,
        "country_code": shipment.country_code,
        "status": shipment.status,
        "vehicle_info": shipment.vehicle_info,
        "pickup_time": _isoformat(shipment.pickup_time),
        "delivery_time": _isoformat(shipment.delivery_time),
        "current_location_lat": shipment.current_location_lat,
        "current_location_lng": shipment.current_location_lng,
        "proof_of_delivery_url": shipment.proof_of_delivery_url,
        "created_at": _isoformat(shipment.created_at),
        "updated_at": _isoformat(shipment.updated_at),
        "load": _load_payload(repository, load),
        "events": [_event_payload(item) for item in repository.list_shipment_events(shipment_id=shipment.shipment_id)],
    }


def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "transport-request")


def _get_correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", _get_request_id(request))


def _record_success(
    *,
    audit_repository: AuditRepository,
    request: Request,
    actor_id: str,
    event_type: str,
    command_name: str,
    payload: dict[str, object],
) -> None:
    audit_repository.record_event(
        request_id=_get_request_id(request),
        actor_id=actor_id,
        event_type=event_type,
        command_name=command_name,
        status="completed",
        reason_code=None,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=payload,
        correlation_id=_get_correlation_id(request),
    )


def _raise_rejected(
    *,
    exc: CommandRejectedError,
    audit_repository: AuditRepository,
    db_session: Session,
    request: Request,
    actor_id: str,
    command_name: str,
 ) -> NoReturn:
    audit_event = audit_repository.record_event(
        request_id=_get_request_id(request),
        actor_id=actor_id,
        event_type="transport.request.rejected",
        command_name=command_name,
        status="rejected",
        reason_code=exc.reason_code,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=exc.payload,
        correlation_id=_get_correlation_id(request),
    )
    db_session.commit()
    raise HTTPException(
        status_code=exc.status_code,
        detail={"error_code": exc.error_code, "audit_event_id": audit_event.id},
    ) from exc


def _validate_status_filter(runtime: TransportRuntime, status: str | None) -> str | None:
    try:
        return runtime.ensure_status_filter(status)
    except CommandRejectedError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.error_code) from exc


def _require_auth(
    request: Request,
    settings: Settings,
    db_session: Session,
) -> AuthContext:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    return auth_context


def _country_code(auth_context: AuthContext) -> str:
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    return country_code


def _can_view_load(auth_context: AuthContext, load: TransportLoad) -> bool:
    if auth_context.actor_subject == "system:test" or auth_context.role == "admin":
        return True
    if load.poster_actor_id == auth_context.actor_subject:
        return True
    if load.assigned_transporter_actor_id == auth_context.actor_subject:
        return True
    return auth_context.role == "transporter" and load.status == "posted"


def _can_view_shipment(auth_context: AuthContext, load: TransportLoad, shipment: Shipment) -> bool:
    if auth_context.actor_subject == "system:test" or auth_context.role == "admin":
        return True
    return auth_context.actor_subject in {load.poster_actor_id, shipment.transporter_actor_id}


@router.get("/loads")
def list_loads(
    request: Request,
    status: str | None = None,
    mine: bool = False,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    runtime = TransportRuntime(repository)
    normalized_status = _validate_status_filter(runtime, status)
    if auth_context.role == "admin" and not mine:
        items = repository.list_available_loads(
            country_code=country_code,
            status=normalized_status,
        )
    elif auth_context.role == "transporter" and not mine:
        if normalized_status not in {None, "posted"}:
            raise HTTPException(status_code=403, detail="transport_load_browser_restricted")
        items = repository.list_available_loads(
            country_code=country_code,
            status="posted",
        )
    else:
        items = repository.list_loads_for_poster(
            actor_id=auth_context.actor_subject,
            country_code=country_code,
            status=normalized_status,
        )
    shipments_by_load = repository.list_shipments_for_loads(
        load_ids=[item.load_id for item in items]
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _load_payload_with_shipment(
                load=item,
                shipment=shipments_by_load.get(item.load_id),
            )
            for item in items
        ],
    }


@router.post("/loads")
def create_load(
    payload: TransportLoadCreateBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = TransportRepository(db_session)
    audit_repository = AuditRepository(db_session)
    runtime = TransportRuntime(repository)
    try:
        load = runtime.create_load(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            country_code=auth_context.country_code,
            origin_location=payload.origin_location,
            destination_location=payload.destination_location,
            commodity=payload.commodity,
            weight_tons=payload.weight_tons,
            vehicle_type_required=payload.vehicle_type_required,
            pickup_date=payload.pickup_date,
            delivery_deadline=payload.delivery_deadline,
            price_offer=payload.price_offer,
            price_currency=payload.price_currency,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request=request,
            actor_id=auth_context.actor_subject,
            command_name="transport.loads.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request=request,
        actor_id=auth_context.actor_subject,
        event_type="transport.load.created",
        command_name="transport.loads.create",
        payload={"load_id": load.load_id},
    )
    db_session.commit()
    return _load_payload(repository, load)


@router.get("/loads/{load_id}")
def get_load(
    load_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    load = repository.get_load(load_id=load_id, country_code=country_code)
    if load is None or not _can_view_load(auth_context, load):
        raise HTTPException(status_code=404, detail="transport_load_not_found")
    return _load_payload(repository, load)


@router.post("/loads/{load_id}/assign")
def assign_load(
    load_id: str,
    payload: LoadAssignBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    audit_repository = AuditRepository(db_session)
    runtime = TransportRuntime(repository)
    load = repository.get_load(load_id=load_id, country_code=country_code)
    if load is None:
        raise HTTPException(status_code=404, detail="transport_load_not_found")
    try:
        result = runtime.assign_load(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            load=load,
            vehicle_info=payload.vehicle_info,
            location_lat=payload.location_lat,
            location_lng=payload.location_lng,
            notes=payload.notes,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request=request,
            actor_id=auth_context.actor_subject,
            command_name="transport.loads.assign",
        )
    _record_success(
        audit_repository=audit_repository,
        request=request,
        actor_id=auth_context.actor_subject,
        event_type="transport.load.assigned",
        command_name="transport.loads.assign",
        payload={"load_id": result.load.load_id, "shipment_id": result.shipment.shipment_id},
    )
    db_session.commit()
    return _shipment_payload(repository, result.shipment)


@router.get("/shipments")
def list_shipments(
    request: Request,
    status: str | None = None,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    runtime = TransportRuntime(repository)
    normalized_status = _validate_status_filter(runtime, status)
    if auth_context.role == "admin":
        items = repository.list_shipments_for_country(
            country_code=country_code,
            status=normalized_status,
        )
    elif auth_context.role == "transporter":
        items = repository.list_shipments_for_transporter(
            actor_id=auth_context.actor_subject,
            country_code=country_code,
            status=normalized_status,
        )
    else:
        items = repository.list_shipments_for_poster(
            actor_id=auth_context.actor_subject,
            country_code=country_code,
            status=normalized_status,
        )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_shipment_payload(repository, item) for item in items],
    }


@router.get("/shipments/{shipment_id}")
def get_shipment(
    shipment_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    shipment = repository.get_shipment(shipment_id=shipment_id, country_code=country_code)
    if shipment is None:
        raise HTTPException(status_code=404, detail="transport_shipment_not_found")
    load = repository.get_load(load_id=shipment.load_id, country_code=country_code)
    if load is None or not _can_view_shipment(auth_context, load, shipment):
        raise HTTPException(status_code=404, detail="transport_shipment_not_found")
    return _shipment_payload(repository, shipment)


@router.post("/shipments/{shipment_id}/events")
def log_shipment_event(
    shipment_id: str,
    payload: ShipmentEventBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    audit_repository = AuditRepository(db_session)
    runtime = TransportRuntime(repository)
    shipment = repository.get_shipment(shipment_id=shipment_id, country_code=country_code)
    if shipment is None:
        raise HTTPException(status_code=404, detail="transport_shipment_not_found")
    load = repository.get_load(load_id=shipment.load_id, country_code=country_code)
    if load is None:
        raise HTTPException(status_code=404, detail="transport_load_not_found")
    try:
        result = runtime.log_operational_event(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            load=load,
            shipment=shipment,
            event_type=payload.event_type,
            location_lat=payload.location_lat,
            location_lng=payload.location_lng,
            notes=payload.notes,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request=request,
            actor_id=auth_context.actor_subject,
            command_name="transport.shipments.events.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request=request,
        actor_id=auth_context.actor_subject,
        event_type="transport.shipment.event_logged",
        command_name="transport.shipments.events.create",
        payload={"shipment_id": result.shipment.shipment_id, "event_id": result.event.event_id},
    )
    db_session.commit()
    return _shipment_payload(repository, result.shipment)


@router.post("/shipments/{shipment_id}/deliver")
def deliver_shipment(
    shipment_id: str,
    payload: ShipmentDeliverBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    country_code = _country_code(auth_context)
    repository = TransportRepository(db_session)
    audit_repository = AuditRepository(db_session)
    runtime = TransportRuntime(repository)
    shipment = repository.get_shipment(shipment_id=shipment_id, country_code=country_code)
    if shipment is None:
        raise HTTPException(status_code=404, detail="transport_shipment_not_found")
    load = repository.get_load(load_id=shipment.load_id, country_code=country_code)
    if load is None:
        raise HTTPException(status_code=404, detail="transport_load_not_found")
    try:
        result = runtime.deliver_shipment(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            load=load,
            shipment=shipment,
            proof_of_delivery_url=payload.proof_of_delivery_url,
            location_lat=payload.location_lat,
            location_lng=payload.location_lng,
            notes=payload.notes,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request=request,
            actor_id=auth_context.actor_subject,
            command_name="transport.shipments.deliver",
        )
    _record_success(
        audit_repository=audit_repository,
        request=request,
        actor_id=auth_context.actor_subject,
        event_type="transport.shipment.delivered",
        command_name="transport.shipments.deliver",
        payload={"shipment_id": result.shipment.shipment_id, "event_id": result.event.event_id},
    )
    db_session.commit()
    return _shipment_payload(repository, result.shipment)
