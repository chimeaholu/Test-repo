from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from secrets import token_hex
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent
from app.db.repositories.audit import AuditRepository
from app.db.repositories.platform_boundary import PlatformBoundaryRepository
from app.modules.platform_boundary.catalog import (
    EVENT_FAMILY_INDEX,
    catalog_payload,
    resolve_event_family,
    serialize_outbound_events,
    utcnow_iso,
)
from app.services.outbox import OutboxService

router = APIRouter(prefix="/api/v1/platform-boundary", tags=["platform-boundary"])


@dataclass(frozen=True)
class PartnerAuthContext:
    partner_slug: str
    token: str

    @property
    def actor_id(self) -> str:
        return f"partner:{self.partner_slug}"


class WebhookDeliveryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_family: str = Field(min_length=3, max_length=120)
    aggregate_id: str = Field(min_length=1, max_length=80)
    delivery_target: str = Field(min_length=12, max_length=240)
    reason: str = Field(min_length=3, max_length=240)


class ProvenanceEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(min_length=1, max_length=120)
    collected_at: str = Field(min_length=20, max_length=64)
    collection_method: str = Field(min_length=2, max_length=80)
    legal_basis: str = Field(min_length=2, max_length=80)
    checksum: str | None = Field(default=None, min_length=3, max_length=128)


class PartnerConsentArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_version: str = Field(min_length=1, max_length=32)
    country_code: str = Field(min_length=2, max_length=2)
    status: Literal["granted", "revoked"]
    scope_ids: list[str] = Field(min_length=1)
    subject_ref: str = Field(min_length=1, max_length=120)
    captured_at: str = Field(min_length=20, max_length=64)
    revoked_at: str | None = Field(default=None, min_length=20, max_length=64)


class InboundIngestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    partner_record_id: str = Field(min_length=1, max_length=120)
    adapter_key: str = Field(min_length=3, max_length=80)
    data_product: str = Field(min_length=3, max_length=120)
    subject_type: Literal["organization_profile", "person_profile", "farm_signal", "market_signal"]
    subject_ref: str = Field(min_length=1, max_length=120)
    country_code: str = Field(min_length=2, max_length=2)
    scope_ids: list[str] = Field(min_length=1)
    contains_personal_data: bool
    occurred_at: str = Field(min_length=20, max_length=64)
    provenance: ProvenanceEnvelope
    consent_artifact: PartnerConsentArtifact | None = None
    payload: dict[str, Any]


def _require_partner_auth(request: Request, settings: Settings) -> PartnerAuthContext:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="partner_authorization_required")
    token = authorization.removeprefix("Bearer ").strip()
    partner_slug = settings.partner_api_tokens.get(token)
    if not partner_slug:
        raise HTTPException(status_code=401, detail="invalid_partner_token")
    return PartnerAuthContext(partner_slug=partner_slug, token=token)


def _audit_event(
    *,
    request: Request,
    repository: AuditRepository,
    actor_id: str,
    event_type: str,
    status: str,
    reason_code: str | None,
    payload: dict[str, object],
) -> AuditEvent:
    return repository.record_event(
        request_id=request.state.request_id,
        actor_id=actor_id,
        event_type=event_type,
        command_name=None,
        status=status,
        reason_code=reason_code,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=payload,
        correlation_id=request.state.correlation_id,
    )


def _evaluate_ingestion_request(payload: InboundIngestionRequest) -> tuple[str, str | None, str]:
    if payload.subject_type == "person_profile" and not payload.contains_personal_data:
        return "rejected", "person_subject_requires_personal_data_flag", "not_required"
    if payload.contains_personal_data and payload.consent_artifact is None:
        return "rejected", "missing_consent_artifact", "missing"
    if payload.consent_artifact is None:
        return "accepted", None, "not_required"
    if payload.consent_artifact.status != "granted":
        return "rejected", "revoked_consent_artifact", "revoked"
    if payload.consent_artifact.country_code.upper() != payload.country_code.upper():
        return "rejected", "consent_country_mismatch", "revoked"
    consent_scope_ids = set(payload.consent_artifact.scope_ids)
    if not set(payload.scope_ids).issubset(consent_scope_ids):
        return "rejected", "scope_outside_consent", "revoked"
    return "accepted", None, "verified"


@router.get("/events/catalog")
def get_event_catalog(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    partner = _require_partner_auth(request, settings)
    audit_repository = AuditRepository(db_session)
    _audit_event(
        request=request,
        repository=audit_repository,
        actor_id=partner.actor_id,
        event_type="platform_boundary.catalog.read",
        status="accepted",
        reason_code=None,
        payload={"partner_slug": partner.partner_slug, "catalog_version": "2026-04-29.eh5"},
    )
    db_session.commit()
    return catalog_payload()


@router.get("/outbound/events")
def list_outbound_events(
    request: Request,
    event_family: str | None = Query(default=None),
    since_id: int | None = Query(default=None, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    partner = _require_partner_auth(request, settings)
    if event_family is not None and event_family not in EVENT_FAMILY_INDEX:
        raise HTTPException(status_code=404, detail="event_family_not_found")

    statement = select(AuditEvent).order_by(AuditEvent.id.asc())
    if since_id is not None:
        statement = statement.where(AuditEvent.id > since_id)
    statement = statement.limit(limit * 3)
    events = db_session.execute(statement).scalars().all()
    items = serialize_outbound_events(events=events, partner_slug=partner.partner_slug)
    if event_family is not None:
        items = [item for item in items if item["event_family"] == event_family]
    items = items[:limit]

    audit_repository = AuditRepository(db_session)
    _audit_event(
        request=request,
        repository=audit_repository,
        actor_id=partner.actor_id,
        event_type="platform_boundary.outbound.read",
        status="accepted",
        reason_code=None,
        payload={
            "partner_slug": partner.partner_slug,
            "event_family": event_family,
            "item_count": len(items),
        },
    )
    db_session.commit()
    cursor = items[-1]["event_id"].removeprefix("audit-") if items else None
    return {
        "schema_version": get_envelope_schema_version(),
        "partner_slug": partner.partner_slug,
        "cursor": cursor,
        "items": items,
    }


@router.post("/outbound/webhooks")
def queue_webhook_delivery(
    payload: WebhookDeliveryRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    partner = _require_partner_auth(request, settings)
    if payload.event_family not in EVENT_FAMILY_INDEX:
        raise HTTPException(status_code=404, detail="event_family_not_found")

    audit_repository = AuditRepository(db_session)
    audit_event = _audit_event(
        request=request,
        repository=audit_repository,
        actor_id=partner.actor_id,
        event_type="platform_boundary.webhook.queued",
        status="queued",
        reason_code=None,
        payload={
            "partner_slug": partner.partner_slug,
            "event_family": payload.event_family,
            "aggregate_id": payload.aggregate_id,
            "delivery_target": payload.delivery_target,
        },
    )
    delivery_id = f"delivery-{token_hex(8)}"
    queued_at = utcnow_iso()
    delivery_payload: dict[str, object] = {
        "schema_version": get_envelope_schema_version(),
        "delivery_id": delivery_id,
        "partner_slug": partner.partner_slug,
        "event_family": payload.event_family,
        "aggregate_id": payload.aggregate_id,
        "delivery_mode": "webhook",
        "delivery_target": payload.delivery_target,
        "status": "queued",
        "queued_at": queued_at,
        "reason": payload.reason,
    }
    boundary_repository = PlatformBoundaryRepository(db_session)
    boundary_repository.create_delivery(
        delivery_id=delivery_id,
        partner_slug=partner.partner_slug,
        event_family=payload.event_family,
        aggregate_id=payload.aggregate_id,
        delivery_mode="webhook",
        delivery_target=payload.delivery_target,
        status="queued",
        payload=delivery_payload,
        audit_event_id=audit_event.id,
    )
    outbox_service = OutboxService(db_session)
    outbox_service.enqueue(
        aggregate_type="partner_boundary_delivery",
        aggregate_id=delivery_id,
        event_type="partner.webhook.queued",
        payload=delivery_payload,
    )
    db_session.commit()
    return delivery_payload


@router.get("/reporting/summary")
def get_reporting_summary(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    partner = _require_partner_auth(request, settings)
    events = db_session.execute(select(AuditEvent).order_by(AuditEvent.id.asc())).scalars().all()
    family_counts: Counter[str] = Counter()
    for event in events:
        family = resolve_event_family(event)
        if family is not None:
            family_counts[family] += 1

    boundary_repository = PlatformBoundaryRepository(db_session)
    inbound_counts = boundary_repository.inbound_status_counts(partner_slug=partner.partner_slug)
    delivery_counts = boundary_repository.delivery_status_counts(partner_slug=partner.partner_slug)

    audit_repository = AuditRepository(db_session)
    _audit_event(
        request=request,
        repository=audit_repository,
        actor_id=partner.actor_id,
        event_type="platform_boundary.reporting.read",
        status="accepted",
        reason_code=None,
        payload={"partner_slug": partner.partner_slug},
    )
    db_session.commit()
    return {
        "schema_version": get_envelope_schema_version(),
        "partner_slug": partner.partner_slug,
        "generated_at": utcnow_iso(),
        "outbound_events": [
            {"event_family": event_family_name, "event_count": event_count}
            for event_family_name, event_count in sorted(family_counts.items())
        ],
        "inbound_ingestion": {
            "accepted": inbound_counts.get("accepted", 0),
            "rejected": inbound_counts.get("rejected", 0),
        },
        "webhook_queue": {
            "queued": delivery_counts.get("queued", 0),
            "published": delivery_counts.get("published", 0),
        },
    }


@router.post("/inbound/records")
def ingest_partner_record(
    payload: InboundIngestionRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    partner = _require_partner_auth(request, settings)
    status, reason_code, consent_status = _evaluate_ingestion_request(payload)
    provenance_status = "verified" if payload.provenance.source_id else "missing"

    audit_repository = AuditRepository(db_session)
    audit_event = _audit_event(
        request=request,
        repository=audit_repository,
        actor_id=partner.actor_id,
        event_type=f"platform_boundary.ingestion.{status}",
        status=status,
        reason_code=reason_code,
        payload={
            "partner_slug": partner.partner_slug,
            "adapter_key": payload.adapter_key,
            "data_product": payload.data_product,
            "subject_ref": payload.subject_ref,
            "country_code": payload.country_code.upper(),
            "scope_ids": sorted(payload.scope_ids),
            "contains_personal_data": payload.contains_personal_data,
        },
    )
    ingest_id = f"ingest-{token_hex(8)}"
    boundary_repository = PlatformBoundaryRepository(db_session)
    boundary_repository.create_inbound_record(
        ingest_id=ingest_id,
        partner_slug=partner.partner_slug,
        partner_record_id=payload.partner_record_id,
        adapter_key=payload.adapter_key,
        data_product=payload.data_product,
        subject_type=payload.subject_type,
        subject_ref=payload.subject_ref,
        country_code=payload.country_code.upper(),
        scope_ids=sorted(set(payload.scope_ids)),
        contains_personal_data=payload.contains_personal_data,
        payload=payload.payload,
        provenance=payload.provenance.model_dump(),
        consent_artifact=payload.consent_artifact.model_dump() if payload.consent_artifact else None,
        status=status,
        reason_code=reason_code,
        audit_event_id=audit_event.id,
    )

    result: dict[str, object] = {
        "schema_version": get_envelope_schema_version(),
        "ingest_id": ingest_id,
        "partner_slug": partner.partner_slug,
        "status": status,
        "reason_code": reason_code,
        "consent_status": consent_status,
        "provenance_status": provenance_status,
    }
    if status == "accepted":
        outbox_service = OutboxService(db_session)
        outbox_service.enqueue(
            aggregate_type="partner_inbound_record",
            aggregate_id=ingest_id,
            event_type="partner.ingestion.accepted",
            payload=result,
        )
        db_session.commit()
        return result

    db_session.commit()
    raise HTTPException(status_code=422, detail=result)
