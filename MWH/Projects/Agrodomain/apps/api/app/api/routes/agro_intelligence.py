from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha1
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.repositories.agro_intelligence import AgroIntelligenceRepository
from app.db.repositories.platform_boundary import PlatformBoundaryRepository
from app.modules.agro_intelligence.connectors import (
    AgroIntelligenceConnectorError,
    AgroIntelligenceConnectorProvider,
    ExternalEntityCandidate,
    build_agro_intelligence_connector_provider,
)
from app.modules.agro_intelligence.runtime import AgroIntelligenceRuntime

router = APIRouter(prefix="/api/v1/agro-intelligence", tags=["agro-intelligence"])

_RESERVED_DEMO_PREFIXES = ("demo ", "demo:", "[demo]")
_OPERATOR_ROLES = {"admin", "advisor", "finance", "cooperative"}


class OpenCorporatesSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=2, max_length=120)
    country_code: str = Field(min_length=2, max_length=2)
    limit: int = Field(default=10, ge=1, le=25)
    materialize: bool = True


class OverpassFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=64)
    value: str = Field(min_length=1, max_length=64)


class OverpassPlaceSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    country_code: str = Field(min_length=2, max_length=2)
    south: float = Field(ge=-90, le=90)
    west: float = Field(ge=-180, le=180)
    north: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)
    filters: list[OverpassFilter] = Field(min_length=1, max_length=5)
    limit: int = Field(default=20, ge=1, le=50)
    materialize: bool = True


class ConsentArtifactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_version: str = Field(min_length=1, max_length=32)
    country_code: str = Field(min_length=2, max_length=2)
    status: Literal["granted", "revoked"]
    scope_ids: list[str] = Field(min_length=1)
    subject_ref: str = Field(min_length=1, max_length=120)
    captured_at: str = Field(min_length=20, max_length=64)
    revoked_at: str | None = Field(default=None, min_length=20, max_length=64)


class PartnerDirectoryRecordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    partner_record_id: str = Field(min_length=1, max_length=120)
    entity_type: Literal["organization", "person_actor"]
    subject_ref: str = Field(min_length=1, max_length=120)
    canonical_name: str = Field(min_length=2, max_length=160)
    country_code: str = Field(min_length=2, max_length=2)
    scope_ids: list[str] = Field(min_length=1)
    contains_personal_data: bool
    consent_artifact: ConsentArtifactInput | None = None
    roles: list[str] = Field(default_factory=list, max_length=8)
    commodity_focus: list[str] = Field(default_factory=list, max_length=8)
    attributes: dict[str, Any] = Field(default_factory=dict)


class PartnerDirectoryImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    partner_slug: str = Field(min_length=2, max_length=80)
    adapter_key: str = Field(default="agro.partner.directory_v1", min_length=3, max_length=80)
    data_product: str = Field(default="agro_intelligence.partner_directory", min_length=3, max_length=120)
    records: list[PartnerDirectoryRecordInput] = Field(min_length=1, max_length=100)


class VerificationDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: str = Field(pattern="^(approve|reject|mark_stale)$")


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


def _require_country_auth(
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


def _require_operator(auth_context: AuthContext) -> None:
    if auth_context.role not in _OPERATOR_ROLES:
        raise HTTPException(status_code=403, detail="operator_scope_required")


def _provider_for_request(request: Request, settings: Settings) -> AgroIntelligenceConnectorProvider:
    provider = getattr(request.app.state, "agro_intelligence_provider", None)
    if provider is not None:
        return provider
    return build_agro_intelligence_connector_provider(settings)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _ensure_non_demo_name(value: str) -> None:
    normalized = value.strip().lower()
    if any(normalized.startswith(prefix) for prefix in _RESERVED_DEMO_PREFIXES):
        raise HTTPException(status_code=422, detail="demo_name_collision")


def _stable_id(prefix: str, *parts: str) -> str:
    digest = sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}-{digest}"


def _ephemeral_id(prefix: str, *parts: str) -> str:
    timestamp = datetime.now(tz=UTC).isoformat()
    return _stable_id(prefix, *parts, timestamp)


def _materialize_candidate(
    *,
    repository: AgroIntelligenceRepository,
    candidate: ExternalEntityCandidate,
    boundary_subject_type: str | None,
    latest_boundary_ingest_id: str | None,
    latest_partner_slug: str | None,
    latest_adapter_key: str | None,
    consent_artifact_id: str | None,
) -> dict[str, object]:
    _ensure_non_demo_name(candidate.canonical_name)
    entity_id = _stable_id("agi-entity", candidate.source_key, candidate.external_id, candidate.country_code)
    document_id = _stable_id("agi-doc", candidate.source_key, candidate.source_id, candidate.country_code)
    repository.upsert_source_document(
        document_id=document_id,
        source_id=candidate.source_id,
        source_tier=candidate.source_tier,
        country_code=candidate.country_code,
        title=candidate.source_document_title,
        document_kind=candidate.source_document_kind,
        entity_refs=[entity_id],
        boundary_ingest_id=latest_boundary_ingest_id,
        partner_slug=latest_partner_slug,
        adapter_key=latest_adapter_key,
        collected_at=_parse_iso_datetime(candidate.collected_at) or datetime.now(tz=UTC),
        legal_basis=candidate.legal_basis,
        checksum=None,
        metadata_json={"source_key": candidate.source_key, **candidate.attributes},
    )
    repository.upsert_entity(
        entity_id=entity_id,
        entity_type=candidate.entity_type,
        canonical_name=candidate.canonical_name,
        country_code=candidate.country_code,
        trust_tier=candidate.trust_tier,
        lifecycle_state="ingested",
        source_tier=candidate.source_tier,
        confidence_score=candidate.confidence_score,
        boundary_subject_type=boundary_subject_type,
        latest_boundary_ingest_id=latest_boundary_ingest_id,
        latest_partner_slug=latest_partner_slug,
        latest_adapter_key=latest_adapter_key,
        consent_artifact_id=consent_artifact_id,
        provenance=[
            {
                "source_id": candidate.source_id,
                "source_tier": candidate.source_tier,
                "collected_at": candidate.collected_at,
                "collection_method": candidate.collection_method,
                "legal_basis": candidate.legal_basis,
                "boundary_ingest_id": latest_boundary_ingest_id,
                "partner_slug": latest_partner_slug,
                "adapter_key": latest_adapter_key,
                "data_product": candidate.source_key,
                "confidence_weight": candidate.confidence_score,
            }
        ],
        attribute_payload=candidate.attributes,
        is_demo_entity=False,
    )
    return {
        "entity_id": entity_id,
        "document_id": document_id,
        "canonical_name": candidate.canonical_name,
        "entity_type": candidate.entity_type,
        "country_code": candidate.country_code,
        "trust_tier": candidate.trust_tier,
        "confidence_score": candidate.confidence_score,
    }


def _evaluate_partner_record(record: PartnerDirectoryRecordInput) -> tuple[str, str | None, str]:
    if record.entity_type == "person_actor" and not record.contains_personal_data:
        return "rejected", "person_subject_requires_personal_data_flag", "not_required"
    if record.contains_personal_data and record.consent_artifact is None:
        return "rejected", "missing_consent_artifact", "missing"
    if record.consent_artifact is None:
        return "accepted", None, "not_required"
    if record.consent_artifact.status != "granted":
        return "rejected", "revoked_consent_artifact", "revoked"
    if record.consent_artifact.country_code.upper() != record.country_code.upper():
        return "rejected", "consent_country_mismatch", "revoked"
    consent_scope_ids = set(record.consent_artifact.scope_ids)
    if not set(record.scope_ids).issubset(consent_scope_ids):
        return "rejected", "scope_outside_consent", "revoked"
    return "accepted", None, "verified"


@router.get("/sources/inventory")
def get_source_inventory(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)
    provider = _provider_for_request(request, settings)
    return {
        "budget_ceiling_usd": settings.agro_intelligence_budget_ceiling_usd,
        "budget_posture": "lean_startup_cap",
        "priority_rule": "buyer_and_processor_acquisition_first",
        "items": [
            item.as_dict()
            for item in provider.source_inventory(
                budget_ceiling_usd=settings.agro_intelligence_budget_ceiling_usd
            )
        ],
    }


@router.post("/connectors/opencorporates/search")
def search_opencorporates(
    payload: OpenCorporatesSearchRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)
    provider = _provider_for_request(request, settings)
    try:
        candidates = provider.search_opencorporates(
            query=payload.query,
            country_code=payload.country_code,
            limit=payload.limit,
        )
    except AgroIntelligenceConnectorError as exc:
        raise HTTPException(status_code=502, detail={"code": exc.code, "detail": exc.detail}) from exc
    repository = AgroIntelligenceRepository(db_session)
    if payload.materialize:
        items = [
            _materialize_candidate(
                repository=repository,
                candidate=candidate,
                boundary_subject_type="organization_profile",
                latest_boundary_ingest_id=None,
                latest_partner_slug=None,
                latest_adapter_key=None,
                consent_artifact_id=None,
            )
            for candidate in candidates
        ]
    else:
        items = [
            {
                "canonical_name": candidate.canonical_name,
                "entity_type": candidate.entity_type,
                "country_code": candidate.country_code,
                "source_id": candidate.source_id,
                "trust_tier": candidate.trust_tier,
                "confidence_score": candidate.confidence_score,
            }
            for candidate in candidates
        ]
    db_session.commit()
    return {
        "source_key": "opencorporates_search",
        "materialized": payload.materialize,
        "budget_fit": "fits_60k_ceiling",
        "item_count": len(items),
        "items": items,
    }


@router.post("/connectors/overpass/places")
def search_overpass_places(
    payload: OverpassPlaceSearchRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)
    provider = _provider_for_request(request, settings)
    try:
        candidates = provider.search_overpass(
            country_code=payload.country_code,
            south=payload.south,
            west=payload.west,
            north=payload.north,
            east=payload.east,
            filters=[(item.key, item.value) for item in payload.filters],
            limit=payload.limit,
        )
    except AgroIntelligenceConnectorError as exc:
        raise HTTPException(status_code=502, detail={"code": exc.code, "detail": exc.detail}) from exc
    repository = AgroIntelligenceRepository(db_session)
    if payload.materialize:
        items = [
            _materialize_candidate(
                repository=repository,
                candidate=candidate,
                boundary_subject_type="market_signal",
                latest_boundary_ingest_id=None,
                latest_partner_slug=None,
                latest_adapter_key=None,
                consent_artifact_id=None,
            )
            for candidate in candidates
        ]
    else:
        items = [
            {
                "canonical_name": candidate.canonical_name,
                "entity_type": candidate.entity_type,
                "country_code": candidate.country_code,
                "source_id": candidate.source_id,
                "trust_tier": candidate.trust_tier,
                "confidence_score": candidate.confidence_score,
            }
            for candidate in candidates
        ]
    db_session.commit()
    return {
        "source_key": "overpass_facility_search",
        "materialized": payload.materialize,
        "budget_fit": "fits_60k_ceiling",
        "item_count": len(items),
        "items": items,
    }


@router.post("/ingestion/imports/partner-directory")
def import_partner_directory(
    payload: PartnerDirectoryImportRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_admin(request, settings, db_session)
    boundary_repository = PlatformBoundaryRepository(db_session)
    repository = AgroIntelligenceRepository(db_session)
    results: list[dict[str, object]] = []
    materialized_count = 0
    rejected_count = 0

    for record in payload.records:
        _ensure_non_demo_name(record.canonical_name)
        status, reason_code, consent_status = _evaluate_partner_record(record)
        ingest_id = _ephemeral_id(
            "agi-ingest",
            payload.partner_slug,
            payload.adapter_key,
            record.partner_record_id,
            record.subject_ref,
        )
        boundary_repository.create_inbound_record(
            ingest_id=ingest_id,
            partner_slug=payload.partner_slug,
            partner_record_id=record.partner_record_id,
            adapter_key=payload.adapter_key,
            data_product=payload.data_product,
            subject_type="person_profile" if record.entity_type == "person_actor" else "organization_profile",
            subject_ref=record.subject_ref,
            country_code=record.country_code.upper(),
            scope_ids=record.scope_ids,
            contains_personal_data=record.contains_personal_data,
            payload={
                "canonical_name": record.canonical_name,
                "roles": record.roles,
                "commodity_focus": record.commodity_focus,
                "attributes": record.attributes,
                "entity_type": record.entity_type,
            },
            provenance={
                "source_id": f"partner:{payload.partner_slug}:{record.partner_record_id}",
                "collected_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
                "collection_method": "partner_directory_import",
                "legal_basis": "contractual_partner_feed",
                "checksum": None,
            },
            consent_artifact=record.consent_artifact.model_dump() if record.consent_artifact else None,
            status=status,
            reason_code=reason_code,
            audit_event_id=None,
        )
        if status != "accepted":
            rejected_count += 1
            results.append(
                {
                    "partner_record_id": record.partner_record_id,
                    "ingest_id": ingest_id,
                    "status": status,
                    "reason_code": reason_code,
                    "consent_status": consent_status,
                }
            )
            continue

        consent_artifact_id: str | None = None
        if record.consent_artifact is not None:
            consent_artifact_id = _stable_id(
                "agi-consent",
                payload.partner_slug,
                record.consent_artifact.subject_ref,
                record.consent_artifact.policy_version,
            )
            repository.upsert_consent_artifact(
                consent_artifact_id=consent_artifact_id,
                subject_ref=record.consent_artifact.subject_ref,
                country_code=record.consent_artifact.country_code.upper(),
                status=record.consent_artifact.status,
                policy_version=record.consent_artifact.policy_version,
                scope_ids=record.consent_artifact.scope_ids,
                captured_at=_parse_iso_datetime(record.consent_artifact.captured_at)
                or datetime.now(tz=UTC),
                revoked_at=_parse_iso_datetime(record.consent_artifact.revoked_at),
                legal_basis="contractual_partner_feed",
                boundary_ingest_id=ingest_id,
                partner_slug=payload.partner_slug,
            )

        materialized = _materialize_candidate(
            repository=repository,
            candidate=ExternalEntityCandidate(
                external_id=record.partner_record_id,
                canonical_name=record.canonical_name,
                entity_type=record.entity_type,
                country_code=record.country_code.upper(),
                source_key=payload.data_product,
                source_id=f"partner:{payload.partner_slug}:{record.partner_record_id}",
                source_tier="A",
                trust_tier="silver" if record.entity_type == "organization" else "bronze",
                confidence_score=82 if record.entity_type == "organization" else 68,
                collected_at=datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
                legal_basis="contractual_partner_feed",
                collection_method="partner_directory_import",
                source_document_title=f"{payload.partner_slug} directory record {record.canonical_name}",
                source_document_kind="partner_upload",
                attributes={
                    "roles": record.roles,
                    "commodity_focus": record.commodity_focus,
                    **record.attributes,
                },
            ),
            boundary_subject_type="person_profile" if record.entity_type == "person_actor" else "organization_profile",
            latest_boundary_ingest_id=ingest_id,
            latest_partner_slug=payload.partner_slug,
            latest_adapter_key=payload.adapter_key,
            consent_artifact_id=consent_artifact_id,
        )
        materialized_count += 1
        results.append(
            {
                "partner_record_id": record.partner_record_id,
                "ingest_id": ingest_id,
                "status": status,
                "consent_status": consent_status,
                **materialized,
            }
        )

    db_session.commit()
    return {
        "source_key": "partner_directory_import",
        "budget_fit": "fits_60k_ceiling",
        "imported_count": len(payload.records),
        "materialized_count": materialized_count,
        "rejected_count": rejected_count,
        "items": results,
    }


@router.get("/overview")
def get_overview(
    request: Request,
    sync: bool = Query(default=False),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = AgroIntelligenceRepository(db_session)
    runtime = AgroIntelligenceRuntime(repository)
    resolution_result = None
    if sync:
        _require_operator(auth_context)
        resolution_result = runtime.run_resolution(country_code=country_code)
        db_session.commit()
    overview = runtime.build_overview(country_code=country_code)
    return {
        "schema_version": get_envelope_schema_version(),
        **overview,
        "resolution_run": (
            {
                "schema_version": get_envelope_schema_version(),
                "country_code": country_code,
                "scanned_records": resolution_result.scanned_records,
                "documents_created": resolution_result.documents_created,
                "entities_created": resolution_result.entities_created,
                "entities_merged": resolution_result.entities_merged,
                "entities_flagged": resolution_result.entities_flagged,
                "relationships_created": resolution_result.relationships_created,
                "claims_created": resolution_result.claims_created,
            }
            if resolution_result
            else None
        ),
    }


@router.get("/entities")
def list_entities(
    request: Request,
    q: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    trust_tier: str | None = Query(default=None),
    lifecycle_state: str | None = Query(default=None),
    source_tier: str | None = Query(default=None),
    only_buyers: bool = Query(default=False),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = AgroIntelligenceRepository(db_session)
    runtime = AgroIntelligenceRuntime(repository)
    entities = repository.list_entities(
        country_code=country_code,
        search=q,
        entity_type=entity_type,
        trust_tier=trust_tier,
        lifecycle_state=lifecycle_state,
        source_tier=source_tier,
    )
    freshness_by_entity = repository.list_freshness_signals(
        entity_ids=[entity.entity_id for entity in entities]
    )
    claims_by_entity = repository.list_verification_claims(
        entity_ids=[entity.entity_id for entity in entities]
    )
    items = [
        runtime.serialize_entity_summary(
            entity=entity,
            freshness_signal=freshness_by_entity.get(entity.entity_id),
            verification_claims=claims_by_entity.get(entity.entity_id, []),
        )
        for entity in entities
    ]
    if only_buyers:
        items = [
            item
            for item in items
            if "buyer" in {str(tag).lower() for tag in item["operator_tags"]}
            or "processor" in {str(tag).lower() for tag in item["operator_tags"]}
            or "offtaker" in {str(tag).lower() for tag in item["operator_tags"]}
        ]
    return {
        "schema_version": get_envelope_schema_version(),
        "country_code": country_code,
        "count": len(items),
        "items": items,
    }


@router.get("/buyers")
def list_buyers(
    request: Request,
    q: str | None = Query(default=None),
    trust_tier: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    return list_entities(
        request=request,
        q=q,
        entity_type="organization",
        trust_tier=trust_tier,
        lifecycle_state=None,
        source_tier=None,
        only_buyers=True,
        db_session=db_session,
        settings=settings,
    )


@router.get("/entities/{entity_id}")
def get_entity_detail(
    entity_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = AgroIntelligenceRepository(db_session)
    runtime = AgroIntelligenceRuntime(repository)
    bundle = repository.get_entity_detail_bundle(entity_id=entity_id)
    if bundle is None or bundle.entity.country_code != country_code:
        raise HTTPException(status_code=404, detail="agro_intelligence_entity_not_found")
    return {
        "schema_version": get_envelope_schema_version(),
        **runtime.serialize_entity_detail(bundle=bundle),
    }


@router.get("/workspace/queue")
def get_verification_queue(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    _require_operator(auth_context)
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    runtime = AgroIntelligenceRuntime(AgroIntelligenceRepository(db_session))
    items = runtime.build_verification_queue(country_code=country_code)
    return {
        "schema_version": get_envelope_schema_version(),
        "country_code": country_code,
        "count": len(items),
        "items": items,
    }


@router.post("/workspace/resolution-run")
def run_resolution(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    _require_operator(auth_context)
    country_code = auth_context.country_code
    if country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    runtime = AgroIntelligenceRuntime(AgroIntelligenceRepository(db_session))
    result = runtime.run_resolution(country_code=country_code)
    db_session.commit()
    return {
        "schema_version": get_envelope_schema_version(),
        "country_code": country_code,
        "scanned_records": result.scanned_records,
        "documents_created": result.documents_created,
        "entities_created": result.entities_created,
        "entities_merged": result.entities_merged,
        "entities_flagged": result.entities_flagged,
        "relationships_created": result.relationships_created,
        "claims_created": result.claims_created,
    }


@router.post("/workspace/queue/{entity_id}/decision")
def apply_verification_decision(
    entity_id: str,
    payload: VerificationDecisionRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_country_auth(request, settings, db_session)
    _require_operator(auth_context)
    runtime = AgroIntelligenceRuntime(AgroIntelligenceRepository(db_session))
    try:
        entity = runtime.apply_verification_decision(
            entity_id=entity_id,
            action=payload.action,
            actor_id=auth_context.actor_subject,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db_session.commit()
    return {
        "schema_version": get_envelope_schema_version(),
        "entity": entity,
    }
