from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.db.models.climate import ClimateAlert, ClimateObservation, MrvEvidenceRecord
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.farm import FarmRepository
from app.modules.climate.provider import (
    WeatherDataset,
    WeatherProvider,
    WeatherProviderError,
    build_weather_provider,
    default_history_window,
    degraded_weather_dataset,
)
from app.modules.climate.risk_engine import ClimateActionPack, build_action_pack
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


def _weather_provider_for_request(request: Request, settings: Settings) -> WeatherProvider:
    provider = getattr(request.app.state, "weather_provider", None)
    if provider is not None:
        return provider
    return build_weather_provider(settings)


def _weather_dataset_payload(dataset: WeatherDataset) -> dict[str, object]:
    return {
        "kind": dataset.kind,
        "provider": dataset.provider,
        "provider_mode": dataset.provider_mode,
        "latitude": dataset.latitude,
        "longitude": dataset.longitude,
        "timezone": dataset.timezone,
        "generated_at": dataset.generated_at,
        "degraded_mode": dataset.degraded_mode,
        "degraded_reasons": dataset.degraded_reasons,
        "source_window_start": dataset.source_window_start,
        "source_window_end": dataset.source_window_end,
        "days": [
            {
                "date": item.date,
                "temperature_max_c": item.temperature_max_c,
                "temperature_min_c": item.temperature_min_c,
                "precipitation_mm": item.precipitation_mm,
                "precipitation_probability_pct": item.precipitation_probability_pct,
                "evapotranspiration_mm": item.evapotranspiration_mm,
                "weather_code": item.weather_code,
            }
            for item in dataset.days
        ],
    }


def _action_pack_payload(pack: ClimateActionPack) -> dict[str, object]:
    return {
        "crop_calendar": {
            "crop_type": pack.crop_calendar.crop_type,
            "country_code": pack.crop_calendar.country_code,
            "stage": pack.crop_calendar.stage,
            "season_label": pack.crop_calendar.season_label,
            "reference_date": pack.crop_calendar.reference_date,
            "planting_window_start": pack.crop_calendar.planting_window_start,
            "planting_window_end": pack.crop_calendar.planting_window_end,
            "expected_harvest_window_start": pack.crop_calendar.expected_harvest_window_start,
            "expected_harvest_window_end": pack.crop_calendar.expected_harvest_window_end,
        },
        "risks": [
            {
                "code": item.code,
                "severity": item.severity,
                "title": item.title,
                "summary": item.summary,
                "recommended_due_date": item.recommended_due_date,
                "linked_alert_id": item.linked_alert_id,
                "source": item.source,
            }
            for item in pack.risks
        ],
        "tasks": [
            {
                "task_id": item.task_id,
                "title": item.title,
                "description": item.description,
                "priority": item.priority,
                "due_date": item.due_date,
                "source": item.source,
                "advisory_topic": item.advisory_topic,
                "linked_alert_id": item.linked_alert_id,
            }
            for item in pack.tasks
        ],
        "advisory": {
            "topic": pack.advisory.topic,
            "draft_question": pack.advisory.draft_question,
            "draft_response": pack.advisory.draft_response,
            "policy_context": pack.advisory.policy_context,
            "requires_human_review": pack.advisory.requires_human_review,
        },
        "degraded_mode": pack.degraded_mode,
        "degraded_reasons": pack.degraded_reasons,
    }


def _reference_farm_id(country_code: str) -> str:
    return f"farm-{country_code.lower()}-001"


def _build_reference_farm_profile_payload(
    *,
    actor_id: str,
    country_code: str,
    schema_version: str,
) -> dict[str, object]:
    farm_id = _reference_farm_id(country_code)
    names = {
        "GH": "Tamale lowland block",
        "NG": "Kaduna floodwatch block",
        "JM": "St. Elizabeth hillside block",
    }
    districts = {
        "GH": "Tamale",
        "NG": "Kaduna North",
        "JM": "St. Elizabeth",
    }
    crops = {
        "GH": "maize",
        "NG": "rice",
        "JM": "callaloo",
    }
    coordinates = {
        "GH": (9.4075, -0.8533),
        "NG": (10.5222, 7.4383),
        "JM": (18.1841, -77.7450),
    }
    latitude, longitude = coordinates.get(country_code, (9.4075, -0.8533))
    now = _isoformat(datetime.now(tz=UTC))
    return {
        "schema_version": schema_version,
        "farm_id": farm_id,
        "actor_id": actor_id,
        "country_code": country_code,
        "farm_name": names.get(country_code, "Reference farm block"),
        "district": districts.get(country_code, "Regional cluster"),
        "crop_type": crops.get(country_code, "maize"),
        "hectares": 7.2 if country_code == "JM" else 12.5,
        "latitude": latitude,
        "longitude": longitude,
        "metadata": {
            "source": "reference_runtime",
            "irrigation": "surface channels" if country_code == "GH" else "rainfed",
        },
        "created_at": now,
        "updated_at": now,
    }


def _build_reference_observation_payloads(
    *,
    actor_id: str,
    country_code: str,
    farm_profile: dict[str, object],
    schema_version: str,
) -> list[dict[str, object]]:
    farm_id = str(farm_profile["farm_id"])
    now = datetime.now(tz=UTC)
    temperature_base = {"GH": 31.0, "NG": 29.0, "JM": 28.0}.get(country_code, 31.0)
    rainfall_base = {"GH": 24.0, "NG": 18.0, "JM": 14.0}.get(country_code, 24.0)
    soil_base = {"GH": 68.0, "NG": 61.0, "JM": 57.0}.get(country_code, 68.0)

    items: list[dict[str, object]] = []
    for index in range(8):
        hours_ago = (7 - index) * 3
        observed_at = now - timedelta(hours=hours_ago)
        source_window_start = observed_at - timedelta(hours=1)
        temperature = round(temperature_base + ((index % 3) - 1) * 1.4, 1)
        rainfall = round(max(rainfall_base + (6 - index) * 1.7, 0.0), 1)
        soil_moisture = round(min(max(soil_base + (3 - index) * 1.9, 22.0), 92.0), 1)
        anomaly_score = round(max(0.12, 0.32 + index * 0.05), 2)
        degraded_mode = index == 7 and country_code == "GH"
        items.append(
            {
                "schema_version": schema_version,
                "observation_id": f"{farm_id}-obs-{index + 1}",
                "farm_id": farm_id,
                "actor_id": actor_id,
                "country_code": country_code,
                "source_id": f"{country_code.lower()}-weather-{index + 1}",
                "source_type": "satellite" if index % 2 == 0 else "station",
                "observed_at": _isoformat(observed_at),
                "source_window_start": _isoformat(source_window_start),
                "source_window_end": _isoformat(observed_at),
                "rainfall_mm": rainfall,
                "temperature_c": temperature,
                "soil_moisture_pct": soil_moisture,
                "anomaly_score": anomaly_score,
                "ingestion_state": "reference",
                "degraded_mode": degraded_mode,
                "degraded_reason_codes": ["source_window_missing"] if degraded_mode else [],
                "assumptions": ["Reference source window in use for the latest radar block."] if degraded_mode else [],
                "provenance": [{"source": "reference_runtime", "window_hours": 1}],
                "normalized_payload": {
                    "humidity_pct": min(95, round(soil_moisture * 0.9)),
                    "uv_index": max(3, min(11, round((temperature - 18) / 2))),
                    "wind_kph": max(8, round(11 + anomaly_score * 14)),
                },
                "farm_profile": farm_profile,
                "created_at": _isoformat(observed_at),
            }
        )
    items.reverse()
    return items


def _reference_climate_payloads_for_request(
    *,
    actor_id: str,
    actor_role: str,
    country_code: str,
    farm_id: str,
    schema_version: str,
    farm_repository: FarmRepository,
) -> tuple[dict[str, object], list[dict[str, object]]] | None:
    if actor_role != "farmer" or farm_id != _reference_farm_id(country_code):
        return None
    if farm_repository.list_farms_for_actor(actor_id=actor_id, country_code=country_code):
        return None
    farm_profile = _build_reference_farm_profile_payload(
        actor_id=actor_id,
        country_code=country_code,
        schema_version=schema_version,
    )
    observations = _build_reference_observation_payloads(
        actor_id=actor_id,
        country_code=country_code,
        farm_profile=farm_profile,
        schema_version=schema_version,
    )
    return farm_profile, observations


def _fetch_weather_datasets(
    *,
    request: Request,
    settings: Settings,
    latitude: float | None,
    longitude: float | None,
) -> tuple[WeatherDataset, WeatherDataset]:
    if latitude is None or longitude is None:
        reason = "missing_coordinates"
        detail = "Farm profile is missing latitude or longitude for provider-backed weather."
        return (
            degraded_weather_dataset(kind="forecast", reason=reason, detail=detail),
            degraded_weather_dataset(kind="history", reason=reason, detail=detail),
        )
    provider = _weather_provider_for_request(request, settings)
    try:
        forecast = provider.fetch_forecast(latitude=latitude, longitude=longitude, days=7)
        history_start, history_end = default_history_window()
        history = provider.fetch_history(
            latitude=latitude,
            longitude=longitude,
            start_date=history_start,
            end_date=history_end,
        )
        return forecast, history
    except WeatherProviderError as exc:
        return (
            degraded_weather_dataset(kind="forecast", reason=exc.code, detail=exc.detail),
            degraded_weather_dataset(kind="history", reason=exc.code, detail=exc.detail),
        )


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
    country_code = auth_context.country_code or "GH"
    profile = repository.get_farm_profile_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=country_code,
    )
    if profile is None:
        reference_payloads = _reference_climate_payloads_for_request(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role or "",
            country_code=country_code,
            farm_id=farm_id,
            schema_version=request.app.state.settings.public_schema_version,
            farm_repository=FarmRepository(db_session),
        )
        if reference_payloads is None:
            raise HTTPException(status_code=404, detail="farm_profile_not_found")
        return reference_payloads[0]
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
    country_code = auth_context.country_code or "GH"
    schema_version = request.app.state.settings.public_schema_version
    profile = repository.get_farm_profile_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=country_code,
    )
    if profile is None:
        reference_payloads = _reference_climate_payloads_for_request(
            actor_id=auth_context.actor_subject,
            actor_role=auth_context.role or "",
            country_code=country_code,
            farm_id=farm_id,
            schema_version=schema_version,
            farm_repository=FarmRepository(db_session),
        )
        if reference_payloads is None:
            raise HTTPException(status_code=404, detail="farm_profile_not_found")
        return {
            "schema_version": schema_version,
            "items": reference_payloads[1],
        }
    observations = repository.list_observations_for_farm(farm_id=farm_id)
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


@router.get("/farms/{farm_id}/weather-outlook")
def get_weather_outlook(
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

    forecast, history = _fetch_weather_datasets(
        request=request,
        settings=settings,
        latitude=profile.latitude,
        longitude=profile.longitude,
    )
    return {
        "schema_version": request.app.state.settings.public_schema_version,
        "farm_profile": _farm_profile_to_payload(profile, request.app.state.settings.public_schema_version),
        "forecast": _weather_dataset_payload(forecast),
        "history": _weather_dataset_payload(history),
    }


@router.get("/farms/{farm_id}/action-pack")
def get_climate_action_pack(
    farm_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")

    climate_repository = ClimateRepository(db_session)
    farm_repository = FarmRepository(db_session)
    profile = climate_repository.get_farm_profile_for_actor(
        farm_id=farm_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="farm_profile_not_found")

    forecast, history = _fetch_weather_datasets(
        request=request,
        settings=settings,
        latitude=profile.latitude,
        longitude=profile.longitude,
    )
    fields = farm_repository.list_fields(farm_id=farm_id)
    crop_cycles = farm_repository.list_crop_cycles(farm_id=farm_id)
    alerts = climate_repository.list_alerts_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        farm_id=farm_id,
    )
    pack = build_action_pack(
        farm_profile=profile,
        forecast=forecast,
        history=history,
        alerts=alerts,
        fields=fields,
        crop_cycles=crop_cycles,
    )
    return {
        "schema_version": request.app.state.settings.public_schema_version,
        "farm_profile": _farm_profile_to_payload(profile, request.app.state.settings.public_schema_version),
        "forecast": _weather_dataset_payload(forecast),
        "history": _weather_dataset_payload(history),
        "open_alert_ids": [item.alert_id for item in alerts if item.status == "open"],
        "action_pack": _action_pack_payload(pack),
    }
