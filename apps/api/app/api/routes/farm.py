from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import (
    get_active_settings,
    get_correlation_id,
    get_request_id,
    get_session,
)
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.climate import FarmProfile
from app.db.models.farm import CropCycle, FarmActivity, FarmField, FarmInput
from app.db.repositories.audit import AuditRepository
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.farm import FarmRepository
from app.modules.farm.runtime import FarmRuntime
from app.services.commands.errors import CommandRejectedError
from app.services.commands.handlers import _farm_profile_to_payload

router = APIRouter(prefix="/api/v1/farms", tags=["farm"])


class InputUsagePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_id: str | None = None
    name: str | None = None
    quantity: float | None = None
    unit: str | None = None


class FarmUpsertBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    farm_name: str
    district: str
    crop_type: str
    hectares: float
    latitude: float | None = None
    longitude: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FieldUpsertBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    boundary_geojson: dict[str, Any] | None = None
    area_hectares: float
    soil_type: str | None = None
    irrigation_type: str | None = None
    current_crop: str | None = None
    planting_date: date | None = None
    expected_harvest_date: date | None = None
    status: str = "active"


class ActivityUpsertBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    field_id: str
    activity_type: str
    date: date
    description: str
    inputs_used: list[InputUsagePayload] = Field(default_factory=list)
    labor_hours: float | None = None
    cost: float | None = None
    notes: str | None = None


class InputUpsertBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_type: str
    name: str
    quantity: float
    unit: str
    cost: float | None = None
    supplier: str | None = None
    purchase_date: date
    expiry_date: date | None = None


class CropCycleUpsertBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    field_id: str
    crop_type: str
    variety: str | None = None
    planting_date: date
    harvest_date: date | None = None
    yield_tons: float | None = None
    revenue: float | None = None
    status: str = "planned"


def _iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _iso_date(value: date | None) -> str | None:
    return value.isoformat() if value is not None else None


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


def _normalize_input_usage(
    *,
    farm_id: str,
    items: list[InputUsagePayload],
    repository: FarmRepository,
) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    for item in items:
        if item.quantity is not None and item.quantity < 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_payload",
                reason_code="input_usage_negative",
                payload={"field": "inputs_used.quantity"},
            )
        if item.input_id is not None:
            farm_input = repository.get_input_for_farm(farm_id=farm_id, input_id=item.input_id)
            if farm_input is None:
                raise CommandRejectedError(
                    status_code=422,
                    error_code="invalid_payload",
                    reason_code="farm_input_not_found",
                    payload={"input_id": item.input_id},
                )
        normalized.append(item.model_dump(exclude_none=True))
    return normalized


def _build_input_usage_totals(activities: list[FarmActivity]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for activity in activities:
        for usage in activity.inputs_used:
            input_id = usage.get("input_id")
            quantity = usage.get("quantity")
            if not isinstance(input_id, str):
                continue
            if not isinstance(quantity, (int, float)):
                continue
            totals[input_id] = round(totals.get(input_id, 0.0) + float(quantity), 2)
    return totals


def _field_payload(
    field: FarmField,
    *,
    crop_cycles_by_field: dict[str, list[CropCycle]],
) -> dict[str, object]:
    field_cycles = crop_cycles_by_field.get(field.field_id, [])
    active_cycle = next((item for item in field_cycles if item.status == "active"), None)
    if active_cycle is None and field_cycles:
        active_cycle = max(field_cycles, key=lambda item: item.planting_date)
    return {
        "schema_version": get_envelope_schema_version(),
        "field_id": field.field_id,
        "farm_id": field.farm_id,
        "actor_id": field.actor_id,
        "country_code": field.country_code,
        "name": field.name,
        "boundary_geojson": field.boundary_geojson,
        "area_hectares": field.area_hectares,
        "soil_type": field.soil_type,
        "irrigation_type": field.irrigation_type,
        "current_crop": field.current_crop,
        "planting_date": _iso_date(field.planting_date),
        "expected_harvest_date": _iso_date(field.expected_harvest_date),
        "status": field.status,
        "insurance_eligible": field.status == "active" and bool(field.current_crop),
        "active_crop_cycle": _crop_cycle_payload(active_cycle) if active_cycle is not None else None,
        "created_at": _iso_datetime(field.created_at),
        "updated_at": _iso_datetime(field.updated_at),
    }


def _activity_payload(activity: FarmActivity) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "activity_id": activity.activity_id,
        "farm_id": activity.farm_id,
        "field_id": activity.field_id,
        "actor_id": activity.actor_id,
        "country_code": activity.country_code,
        "activity_type": activity.activity_type,
        "date": _iso_date(activity.activity_date),
        "description": activity.description,
        "inputs_used": activity.inputs_used,
        "labor_hours": activity.labor_hours,
        "cost": activity.cost,
        "notes": activity.notes,
        "created_at": _iso_datetime(activity.created_at),
        "updated_at": _iso_datetime(activity.updated_at),
    }


def _input_payload(farm_input: FarmInput, *, quantity_used: float) -> dict[str, object]:
    quantity_remaining = round(max(0.0, farm_input.quantity - quantity_used), 2)
    return {
        "schema_version": get_envelope_schema_version(),
        "input_id": farm_input.input_id,
        "farm_id": farm_input.farm_id,
        "actor_id": farm_input.actor_id,
        "country_code": farm_input.country_code,
        "input_type": farm_input.input_type,
        "name": farm_input.name,
        "quantity": farm_input.quantity,
        "unit": farm_input.unit,
        "cost": farm_input.cost,
        "supplier": farm_input.supplier,
        "purchase_date": _iso_date(farm_input.purchase_date),
        "expiry_date": _iso_date(farm_input.expiry_date),
        "quantity_used": quantity_used,
        "quantity_remaining": quantity_remaining,
        "low_stock": quantity_remaining <= max(1.0, farm_input.quantity * 0.2),
        "created_at": _iso_datetime(farm_input.created_at),
        "updated_at": _iso_datetime(farm_input.updated_at),
    }


def _crop_cycle_payload(crop_cycle: CropCycle | None) -> dict[str, object] | None:
    if crop_cycle is None:
        return None
    return {
        "schema_version": get_envelope_schema_version(),
        "crop_cycle_id": crop_cycle.crop_cycle_id,
        "farm_id": crop_cycle.farm_id,
        "field_id": crop_cycle.field_id,
        "actor_id": crop_cycle.actor_id,
        "country_code": crop_cycle.country_code,
        "crop_type": crop_cycle.crop_type,
        "variety": crop_cycle.variety,
        "planting_date": _iso_date(crop_cycle.planting_date),
        "harvest_date": _iso_date(crop_cycle.harvest_date),
        "yield_tons": crop_cycle.yield_tons,
        "revenue": crop_cycle.revenue,
        "status": crop_cycle.status,
        "created_at": _iso_datetime(crop_cycle.created_at),
        "updated_at": _iso_datetime(crop_cycle.updated_at),
    }


def _farm_summary(
    farm: FarmProfile,
    *,
    fields: list[FarmField],
    crop_cycles: list[CropCycle],
    activities: list[FarmActivity],
    farm_inputs: list[FarmInput],
    alerts: list[object],
    observations: list[object],
) -> dict[str, object]:
    next_harvest_candidates = [
        candidate
        for candidate in [field.expected_harvest_date for field in fields]
        if candidate is not None and candidate >= date.today()
    ]
    active_fields = [field for field in fields if field.status == "active"]
    active_cycles = [cycle for cycle in crop_cycles if cycle.status == "active"]
    harvested_cycles = [cycle for cycle in crop_cycles if cycle.status == "harvested"]
    total_area = round(sum(field.area_hectares for field in fields), 2)
    total_revenue = round(
        sum((cycle.revenue or 0.0) for cycle in harvested_cycles),
        2,
    )

    return {
        "total_fields": len(fields),
        "active_fields": len(active_fields),
        "total_area_hectares": total_area if total_area > 0 else farm.hectares,
        "activity_count": len(activities),
        "inventory_count": len(farm_inputs),
        "active_crop_cycles": len(active_cycles),
        "harvested_crop_cycles": len(harvested_cycles),
        "insurance_eligible_fields": sum(
            1 for field in fields if field.status == "active" and field.current_crop
        ),
        "active_alerts": sum(1 for alert in alerts if alert.status == "open"),
        "next_harvest_date": (
            min(next_harvest_candidates).isoformat() if next_harvest_candidates else None
        ),
        "last_observed_at": _iso_datetime(observations[0].observed_at if observations else None),
        "total_revenue": total_revenue,
    }


def _farm_payload(
    farm: FarmProfile,
    *,
    fields: list[FarmField],
    crop_cycles: list[CropCycle],
    activities: list[FarmActivity],
    farm_inputs: list[FarmInput],
    alerts: list[object],
    observations: list[object],
) -> dict[str, object]:
    payload = _farm_profile_to_payload(farm, get_envelope_schema_version())
    payload["summary"] = _farm_summary(
        farm,
        fields=fields,
        crop_cycles=crop_cycles,
        activities=activities,
        farm_inputs=farm_inputs,
        alerts=alerts,
        observations=observations,
    )
    return payload


def _record_success(
    *,
    audit_repository: AuditRepository,
    request_id: str,
    correlation_id: str,
    actor_id: str,
    event_type: str,
    command_name: str,
    payload: dict[str, object],
) -> None:
    audit_repository.record_event(
        request_id=request_id,
        actor_id=actor_id,
        event_type=event_type,
        command_name=command_name,
        status="completed",
        reason_code=None,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=payload,
        correlation_id=correlation_id,
    )


def _raise_rejected(
    *,
    exc: CommandRejectedError,
    audit_repository: AuditRepository,
    db_session: Session,
    request_id: str,
    correlation_id: str,
    actor_id: str,
    command_name: str,
) -> None:
    audit_event = audit_repository.record_event(
        request_id=request_id,
        actor_id=actor_id,
        event_type="farm.request.rejected",
        command_name=command_name,
        status="rejected",
        reason_code=exc.reason_code,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=exc.payload,
        correlation_id=correlation_id,
    )
    db_session.commit()
    raise HTTPException(
        status_code=exc.status_code,
        detail={"error_code": exc.error_code, "audit_event_id": audit_event.id},
    ) from exc


@router.get("")
def list_farms(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    items = repository.list_farms_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    farm_ids = [item.farm_id for item in items]
    climate_repository = ClimateRepository(db_session)
    fields_by_farm = repository.list_fields_for_farms(farm_ids=farm_ids)
    crop_cycles_by_farm = repository.list_crop_cycles_for_farms(farm_ids=farm_ids)
    activities_by_farm = repository.list_activities_for_farms(farm_ids=farm_ids)
    inputs_by_farm = repository.list_inputs_for_farms(farm_ids=farm_ids)
    alerts_by_farm = climate_repository.list_alerts_for_farms(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_ids=farm_ids,
    )
    observations_by_farm = climate_repository.list_observations_for_farms(farm_ids=farm_ids)
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _farm_payload(
                item,
                fields=fields_by_farm.get(item.farm_id, []),
                crop_cycles=crop_cycles_by_farm.get(item.farm_id, []),
                activities=activities_by_farm.get(item.farm_id, []),
                farm_inputs=inputs_by_farm.get(item.farm_id, []),
                alerts=alerts_by_farm.get(item.farm_id, []),
                observations=observations_by_farm.get(item.farm_id, []),
            )
            for item in items
        ],
    }


@router.post("")
def create_farm(
    payload: FarmUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    climate_repository = ClimateRepository(db_session)
    audit_repository = AuditRepository(db_session)
    runtime = FarmRuntime(repository)
    try:
        result = runtime.create_farm(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            country_code=auth_context.country_code or "GH",
            farm_name=payload.farm_name,
            district=payload.district,
            crop_type=payload.crop_type,
            hectares=payload.hectares,
            latitude=payload.latitude,
            longitude=payload.longitude,
            metadata_json=payload.metadata,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.created",
        command_name="farm.create",
        payload={"farm_id": result.farm.farm_id},
    )
    db_session.commit()
    return _farm_payload(
        result.farm,
        repository=repository,
        climate_repository=climate_repository,
    )


@router.get("/{farm_id}")
def get_farm(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    climate_repository = ClimateRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    fields = repository.list_fields(farm_id=farm.farm_id)
    crop_cycles = repository.list_crop_cycles(farm_id=farm.farm_id)
    activities = repository.list_activities(farm_id=farm.farm_id)
    inputs = repository.list_inputs(farm_id=farm.farm_id)
    alerts = climate_repository.list_alerts_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm.farm_id,
    )
    observations = climate_repository.list_observations_for_farm(farm_id=farm.farm_id)
    return _farm_payload(
        farm,
        fields=fields,
        crop_cycles=crop_cycles,
        activities=activities,
        farm_inputs=inputs,
        alerts=alerts,
        observations=observations,
    )


@router.put("/{farm_id}")
def update_farm(
    farm_id: str,
    payload: FarmUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    climate_repository = ClimateRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    runtime = FarmRuntime(repository)
    try:
        updated = runtime.update_farm(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm=farm,
            farm_name=payload.farm_name,
            district=payload.district,
            crop_type=payload.crop_type,
            hectares=payload.hectares,
            latitude=payload.latitude,
            longitude=payload.longitude,
            metadata_json=payload.metadata,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.update",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.updated",
        command_name="farm.update",
        payload={"farm_id": updated.farm_id},
    )
    db_session.commit()
    return _farm_payload(
        updated,
        repository=repository,
        climate_repository=climate_repository,
    )


@router.get("/{farm_id}/fields")
def list_fields(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    crop_cycles = repository.list_crop_cycles(farm_id=farm_id)
    crop_cycles_by_field: dict[str, list[CropCycle]] = {}
    for item in crop_cycles:
        crop_cycles_by_field.setdefault(item.field_id, []).append(item)
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _field_payload(item, crop_cycles_by_field=crop_cycles_by_field)
            for item in repository.list_fields(farm_id=farm_id)
        ],
    }


@router.post("/{farm_id}/fields")
def create_field(
    farm_id: str,
    payload: FieldUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    runtime = FarmRuntime(repository)
    try:
        result = runtime.create_field(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm=farm,
            name=payload.name,
            boundary_geojson=payload.boundary_geojson,
            area_hectares=payload.area_hectares,
            soil_type=payload.soil_type,
            irrigation_type=payload.irrigation_type,
            current_crop=payload.current_crop,
            planting_date=payload.planting_date,
            expected_harvest_date=payload.expected_harvest_date,
            status=payload.status,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.fields.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.field.created",
        command_name="farm.fields.create",
        payload={"farm_id": farm_id, "field_id": result.field.field_id},
    )
    db_session.commit()
    crop_cycles_by_field = {result.field.field_id: [result.crop_cycle]} if result.crop_cycle else {}
    return _field_payload(result.field, crop_cycles_by_field=crop_cycles_by_field)


@router.get("/{farm_id}/fields/{field_id}")
def get_field(
    farm_id: str,
    field_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    crop_cycles = repository.list_crop_cycles(farm_id=farm_id)
    crop_cycles_by_field: dict[str, list[CropCycle]] = {}
    for item in crop_cycles:
        crop_cycles_by_field.setdefault(item.field_id, []).append(item)
    return _field_payload(field, crop_cycles_by_field=crop_cycles_by_field)


@router.put("/{farm_id}/fields/{field_id}")
def update_field(
    farm_id: str,
    field_id: str,
    payload: FieldUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    runtime = FarmRuntime(repository)
    try:
        updated = runtime.update_field(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            field=field,
            name=payload.name,
            boundary_geojson=payload.boundary_geojson,
            area_hectares=payload.area_hectares,
            soil_type=payload.soil_type,
            irrigation_type=payload.irrigation_type,
            current_crop=payload.current_crop,
            planting_date=payload.planting_date,
            expected_harvest_date=payload.expected_harvest_date,
            status=payload.status,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.fields.update",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.field.updated",
        command_name="farm.fields.update",
        payload={"farm_id": farm_id, "field_id": updated.field_id},
    )
    db_session.commit()
    crop_cycles = repository.list_crop_cycles(farm_id=farm_id)
    crop_cycles_by_field: dict[str, list[CropCycle]] = {}
    for item in crop_cycles:
        crop_cycles_by_field.setdefault(item.field_id, []).append(item)
    return _field_payload(updated, crop_cycles_by_field=crop_cycles_by_field)


@router.delete("/{farm_id}/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_field(
    farm_id: str,
    field_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> Response:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    activities = [item for item in repository.list_activities(farm_id=farm_id) if item.field_id == field_id]
    crop_cycles = [item for item in repository.list_crop_cycles(farm_id=farm_id) if item.field_id == field_id]
    if activities or crop_cycles:
        exc = CommandRejectedError(
            status_code=409,
            error_code="field_has_dependents",
            reason_code="field_delete_blocked",
            payload={
                "field_id": field_id,
                "activity_count": len(activities),
                "crop_cycle_count": len(crop_cycles),
            },
        )
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.fields.delete",
        )
    repository.delete_field(field=field)
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.field.deleted",
        command_name="farm.fields.delete",
        payload={"farm_id": farm_id, "field_id": field_id},
    )
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{farm_id}/activities")
def list_activities(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_activity_payload(item) for item in repository.list_activities(farm_id=farm_id)],
    }


@router.post("/{farm_id}/activities")
def create_activity(
    farm_id: str,
    payload: ActivityUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=payload.field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    runtime = FarmRuntime(repository)
    try:
        activity = runtime.create_activity(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm=farm,
            field=field,
            activity_type=payload.activity_type,
            activity_date=payload.date,
            description=payload.description,
            inputs_used=_normalize_input_usage(
                farm_id=farm_id,
                items=payload.inputs_used,
                repository=repository,
            ),
            labor_hours=payload.labor_hours,
            cost=payload.cost,
            notes=payload.notes,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.activities.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.activity.created",
        command_name="farm.activities.create",
        payload={"farm_id": farm_id, "activity_id": activity.activity_id},
    )
    db_session.commit()
    return _activity_payload(activity)


@router.get("/{farm_id}/activities/{activity_id}")
def get_activity(
    farm_id: str,
    activity_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    activity = repository.get_activity_for_farm(farm_id=farm_id, activity_id=activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="activity_not_found")
    return _activity_payload(activity)


@router.put("/{farm_id}/activities/{activity_id}")
def update_activity(
    farm_id: str,
    activity_id: str,
    payload: ActivityUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    activity = repository.get_activity_for_farm(farm_id=farm_id, activity_id=activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="activity_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=payload.field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    runtime = FarmRuntime(repository)
    try:
        updated = runtime.update_activity(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            activity=activity,
            field=field,
            activity_type=payload.activity_type,
            activity_date=payload.date,
            description=payload.description,
            inputs_used=_normalize_input_usage(
                farm_id=farm_id,
                items=payload.inputs_used,
                repository=repository,
            ),
            labor_hours=payload.labor_hours,
            cost=payload.cost,
            notes=payload.notes,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.activities.update",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.activity.updated",
        command_name="farm.activities.update",
        payload={"farm_id": farm_id, "activity_id": updated.activity_id},
    )
    db_session.commit()
    return _activity_payload(updated)


@router.delete("/{farm_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    farm_id: str,
    activity_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> Response:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    activity = repository.get_activity_for_farm(farm_id=farm_id, activity_id=activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="activity_not_found")
    repository.delete_activity(activity=activity)
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.activity.deleted",
        command_name="farm.activities.delete",
        payload={"farm_id": farm_id, "activity_id": activity_id},
    )
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{farm_id}/inputs")
def list_inputs(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    activities = repository.list_activities(farm_id=farm_id)
    usage_totals = _build_input_usage_totals(activities)
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _input_payload(item, quantity_used=usage_totals.get(item.input_id, 0.0))
            for item in repository.list_inputs(farm_id=farm_id)
        ],
    }


@router.post("/{farm_id}/inputs")
def create_input(
    farm_id: str,
    payload: InputUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    runtime = FarmRuntime(repository)
    try:
        farm_input = runtime.create_input(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm=farm,
            input_type=payload.input_type,
            name=payload.name,
            quantity=payload.quantity,
            unit=payload.unit,
            cost=payload.cost,
            supplier=payload.supplier,
            purchase_date=payload.purchase_date,
            expiry_date=payload.expiry_date,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.inputs.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.input.created",
        command_name="farm.inputs.create",
        payload={"farm_id": farm_id, "input_id": farm_input.input_id},
    )
    db_session.commit()
    return _input_payload(farm_input, quantity_used=0.0)


@router.get("/{farm_id}/inputs/{input_id}")
def get_input(
    farm_id: str,
    input_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    farm_input = repository.get_input_for_farm(farm_id=farm_id, input_id=input_id)
    if farm_input is None:
        raise HTTPException(status_code=404, detail="farm_input_not_found")
    usage_totals = _build_input_usage_totals(repository.list_activities(farm_id=farm_id))
    return _input_payload(farm_input, quantity_used=usage_totals.get(input_id, 0.0))


@router.put("/{farm_id}/inputs/{input_id}")
def update_input(
    farm_id: str,
    input_id: str,
    payload: InputUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    farm_input = repository.get_input_for_farm(farm_id=farm_id, input_id=input_id)
    if farm_input is None:
        raise HTTPException(status_code=404, detail="farm_input_not_found")
    runtime = FarmRuntime(repository)
    try:
        updated = runtime.update_input(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm_input=farm_input,
            input_type=payload.input_type,
            name=payload.name,
            quantity=payload.quantity,
            unit=payload.unit,
            cost=payload.cost,
            supplier=payload.supplier,
            purchase_date=payload.purchase_date,
            expiry_date=payload.expiry_date,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.inputs.update",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.input.updated",
        command_name="farm.inputs.update",
        payload={"farm_id": farm_id, "input_id": input_id},
    )
    db_session.commit()
    usage_totals = _build_input_usage_totals(repository.list_activities(farm_id=farm_id))
    return _input_payload(updated, quantity_used=usage_totals.get(input_id, 0.0))


@router.delete("/{farm_id}/inputs/{input_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_input(
    farm_id: str,
    input_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> Response:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    farm_input = repository.get_input_for_farm(farm_id=farm_id, input_id=input_id)
    if farm_input is None:
        raise HTTPException(status_code=404, detail="farm_input_not_found")
    repository.delete_input(farm_input=farm_input)
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.input.deleted",
        command_name="farm.inputs.delete",
        payload={"farm_id": farm_id, "input_id": input_id},
    )
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{farm_id}/crop-cycles")
def list_crop_cycles(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_crop_cycle_payload(item) for item in repository.list_crop_cycles(farm_id=farm_id)],
    }


@router.post("/{farm_id}/crop-cycles")
def create_crop_cycle(
    farm_id: str,
    payload: CropCycleUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=payload.field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    runtime = FarmRuntime(repository)
    try:
        crop_cycle = runtime.create_crop_cycle(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            farm=farm,
            field=field,
            crop_type=payload.crop_type,
            variety=payload.variety,
            planting_date=payload.planting_date,
            harvest_date=payload.harvest_date,
            yield_tons=payload.yield_tons,
            revenue=payload.revenue,
            status=payload.status,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.crop_cycles.create",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.crop_cycle.created",
        command_name="farm.crop_cycles.create",
        payload={"farm_id": farm_id, "crop_cycle_id": crop_cycle.crop_cycle_id},
    )
    db_session.commit()
    crop_cycle_payload = _crop_cycle_payload(crop_cycle)
    assert crop_cycle_payload is not None
    return crop_cycle_payload


@router.get("/{farm_id}/crop-cycles/{crop_cycle_id}")
def get_crop_cycle(
    farm_id: str,
    crop_cycle_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    crop_cycle = repository.get_crop_cycle_for_farm(farm_id=farm_id, crop_cycle_id=crop_cycle_id)
    if crop_cycle is None:
        raise HTTPException(status_code=404, detail="crop_cycle_not_found")
    crop_cycle_payload = _crop_cycle_payload(crop_cycle)
    assert crop_cycle_payload is not None
    return crop_cycle_payload


@router.put("/{farm_id}/crop-cycles/{crop_cycle_id}")
def update_crop_cycle(
    farm_id: str,
    crop_cycle_id: str,
    payload: CropCycleUpsertBody,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> dict[str, object]:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    crop_cycle = repository.get_crop_cycle_for_farm(farm_id=farm_id, crop_cycle_id=crop_cycle_id)
    if crop_cycle is None:
        raise HTTPException(status_code=404, detail="crop_cycle_not_found")
    field = repository.get_field_for_farm(farm_id=farm_id, field_id=payload.field_id)
    if field is None:
        raise HTTPException(status_code=404, detail="field_not_found")
    runtime = FarmRuntime(repository)
    try:
        updated = runtime.update_crop_cycle(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role,
            crop_cycle=crop_cycle,
            field=field,
            crop_type=payload.crop_type,
            variety=payload.variety,
            planting_date=payload.planting_date,
            harvest_date=payload.harvest_date,
            yield_tons=payload.yield_tons,
            revenue=payload.revenue,
            status=payload.status,
        )
    except CommandRejectedError as exc:
        _raise_rejected(
            exc=exc,
            audit_repository=audit_repository,
            db_session=db_session,
            request_id=request_id,
            correlation_id=correlation_id,
            actor_id=auth_context.actor_subject,
            command_name="farm.crop_cycles.update",
        )
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.crop_cycle.updated",
        command_name="farm.crop_cycles.update",
        payload={"farm_id": farm_id, "crop_cycle_id": crop_cycle_id},
    )
    db_session.commit()
    crop_cycle_payload = _crop_cycle_payload(updated)
    assert crop_cycle_payload is not None
    return crop_cycle_payload


@router.delete("/{farm_id}/crop-cycles/{crop_cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crop_cycle(
    farm_id: str,
    crop_cycle_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
    request_id: str = Depends(get_request_id),
    correlation_id: str = Depends(get_correlation_id),
) -> Response:
    auth_context = _require_auth(request, settings, db_session)
    repository = FarmRepository(db_session)
    audit_repository = AuditRepository(db_session)
    farm = repository.get_farm_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if farm is None:
        raise HTTPException(status_code=404, detail="farm_not_found")
    crop_cycle = repository.get_crop_cycle_for_farm(farm_id=farm_id, crop_cycle_id=crop_cycle_id)
    if crop_cycle is None:
        raise HTTPException(status_code=404, detail="crop_cycle_not_found")
    repository.delete_crop_cycle(crop_cycle=crop_cycle)
    _record_success(
        audit_repository=audit_repository,
        request_id=request_id,
        correlation_id=correlation_id,
        actor_id=auth_context.actor_subject,
        event_type="farm.crop_cycle.deleted",
        command_name="farm.crop_cycles.delete",
        payload={"farm_id": farm_id, "crop_cycle_id": crop_cycle_id},
    )
    db_session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
