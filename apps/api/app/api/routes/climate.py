from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.models.climate import ClimateAlert, ClimateObservation, MrvEvidenceRecord
from app.db.repositories.climate import ClimateRepository
from app.services.commands.handlers import (
    _alert_to_payload,
    _farm_profile_to_payload,
    _mrv_evidence_to_payload,
    _observation_to_payload,
)

router = APIRouter(prefix="/api/v1/climate", tags=["climate"])


def _isoformat(value: datetime | None) -> str:
    if value is None:
        return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC).isoformat().replace("+00:00", "Z")
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _contract_alert_payload(
    alert: ClimateAlert,
    *,
    schema_version: str,
) -> dict[str, object]:
    severity = alert.severity
    if severity == "high":
        severity = "warning"
    if severity == "low":
        severity = "info"
    return {
        "schema_version": schema_version,
        "alert_id": alert.alert_id,
        "farm_profile_id": alert.farm_id,
        "country_code": alert.country_code,
        "locale": "en-GH" if alert.country_code == "GH" else f"en-{alert.country_code}",
        "severity": severity,
        "title": alert.headline,
        "summary": alert.detail,
        "source_ids": [alert.observation_id] if alert.observation_id else [alert.alert_id],
        "degraded_mode": alert.degraded_mode,
        "acknowledged": alert.status == "acknowledged",
        "created_at": _isoformat(alert.created_at),
    }


def _contract_degraded_mode_payload(
    observation: ClimateObservation,
    *,
    schema_version: str,
) -> dict[str, object]:
    assumptions = observation.assumptions or [
        "Source window is incomplete or inconsistent. Treat downstream climate outputs as degraded."
    ]
    return {
        "schema_version": schema_version,
        "source_window_id": observation.observation_id,
        "country_code": observation.country_code,
        "farm_profile_id": observation.farm_id,
        "degraded_mode": True,
        "reason_code": observation.degraded_reason_codes[0]
        if observation.degraded_reason_codes
        else "source_window_unavailable",
        "assumptions": assumptions,
        "source_ids": [observation.source_id],
        "detected_at": _isoformat(observation.created_at),
    }


def _contract_mrv_payload(
    record: MrvEvidenceRecord,
    *,
    schema_version: str,
) -> dict[str, object]:
    method_reference = record.method_references[0] if record.method_references else record.method_tag
    source_references = []
    for index, provenance_item in enumerate(record.provenance):
        if not isinstance(provenance_item, dict):
            continue
        source_id = str(
            provenance_item.get("source_id")
            or provenance_item.get("observation_id")
            or f"{record.evidence_id}-source-{index + 1}"
        )
        source_references.append(
            {
                "source_id": source_id,
                "title": str(provenance_item.get("title") or f"Climate source {source_id}"),
                "method_reference": str(
                    provenance_item.get("method_reference")
                    or method_reference
                ),
            }
        )
    if not source_references:
        source_references.append(
            {
                "source_id": f"{record.evidence_id}-source-1",
                "title": f"Climate source {record.evidence_id}",
                "method_reference": method_reference,
            }
        )

    return {
        "schema_version": schema_version,
        "evidence_id": record.evidence_id,
        "farm_profile_id": record.farm_id,
        "country_code": record.country_code,
        "method_tag": record.method_tag,
        "assumption_notes": record.assumptions,
        "source_references": source_references,
        "source_completeness": "degraded" if record.degraded_mode else "complete",
        "created_at": _isoformat(record.created_at),
    }


@router.get("/alerts")
def list_climate_alerts(
    request: Request,
    farm_id: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    items = repository.list_alerts_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm_id,
    )
    profiles = repository.list_farm_profiles(farm_ids=list({item.farm_id for item in items}))
    schema_version = request.app.state.settings.public_schema_version
    return {
        "schema_version": schema_version,
        "items": [
            _alert_to_payload(
                item,
                schema_version,
                profiles.get(item.farm_id),
            )
            for item in items
        ],
    }


@router.get("/degraded-modes")
def list_climate_degraded_modes(
    request: Request,
    farm_id: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> list[dict[str, object]]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    alerts = repository.list_alerts_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm_id,
    )
    fetched_observations = repository.list_observations_by_ids(
        observation_ids=[
            alert.observation_id
            for alert in alerts
            if alert.observation_id is not None
        ]
    )
    observations_by_id: dict[str, ClimateObservation] = {}
    for alert in alerts:
        if not alert.observation_id:
            continue
        observation = fetched_observations.get(alert.observation_id)
        if observation is None or not observation.degraded_mode:
            continue
        observations_by_id[observation.observation_id] = observation

    schema_version = request.app.state.settings.public_schema_version
    return [
        _contract_degraded_mode_payload(item, schema_version=schema_version)
        for item in observations_by_id.values()
    ]


@router.get("/alerts/{alert_id}")
def get_climate_alert(
    alert_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    alert = repository.get_alert_for_actor(
        alert_id=alert_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="climate_alert_not_found")
    schema_version = request.app.state.settings.public_schema_version
    return _alert_to_payload(
        alert,
        schema_version,
        repository.get_farm_profile(farm_id=alert.farm_id),
    )


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_climate_alert(
    alert_id: str,
    request: Request,
    payload: dict[str, object] | None = None,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    alert = repository.get_alert_for_actor(
        alert_id=alert_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if alert is None:
        raise HTTPException(status_code=404, detail="climate_alert_not_found")
    if alert.status == "acknowledged":
        raise HTTPException(status_code=409, detail="climate_alert_already_acknowledged")

    note = None
    if isinstance(payload, dict) and payload.get("note") is not None:
        note = str(payload["note"])
    acknowledged_at = datetime.now(tz=UTC)
    repository.acknowledge_alert(
        alert=alert,
        actor_id=auth_context.actor_subject,
        acknowledged_at=acknowledged_at,
        note=note,
    )
    db_session.commit()
    schema_version = request.app.state.settings.public_schema_version
    return {
        "schema_version": schema_version,
        "alert_id": alert.alert_id,
        "actor_id": auth_context.actor_subject,
        "acknowledged_at": _isoformat(alert.acknowledged_at),
        "note": alert.acknowledgement_note,
    }


@router.get("/farms/{farm_id}")
def get_farm_profile(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    profile = repository.get_farm_profile_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="farm_profile_not_found")
    schema_version = request.app.state.settings.public_schema_version
    return _farm_profile_to_payload(profile, schema_version)


@router.get("/observations")
def list_observations(
    request: Request,
    farm_id: str = Query(...),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    profile = repository.get_farm_profile_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="farm_profile_not_found")
    observations = repository.list_observations_for_farm(farm_id=farm_id)
    schema_version = request.app.state.settings.public_schema_version
    return {
        "schema_version": schema_version,
        "items": [
            _observation_to_payload(item, schema_version, profile) for item in observations
        ],
    }


@router.get("/mrv-evidence")
def list_contract_mrv_evidence(
    request: Request,
    farm_id: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> list[dict[str, object]]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    items = repository.list_mrv_evidence_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm_id,
    )
    schema_version = request.app.state.settings.public_schema_version
    return [_contract_mrv_payload(item, schema_version=schema_version) for item in items]


@router.get("/evidence")
def list_mrv_evidence(
    request: Request,
    farm_id: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    repository = ClimateRepository(db_session)
    items = repository.list_mrv_evidence_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm_id,
    )
    profiles = repository.list_farm_profiles(farm_ids=list({item.farm_id for item in items}))
    schema_version = request.app.state.settings.public_schema_version
    return {
        "schema_version": schema_version,
        "items": [
            _mrv_evidence_to_payload(
                item,
                schema_version,
                profiles.get(item.farm_id),
            )
            for item in items
        ],
    }
