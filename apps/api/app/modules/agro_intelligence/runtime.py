from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha1
from secrets import token_hex
from typing import Any

from app.db.models.agro_intelligence import (
    AgroIntelligenceConsentArtifact,
    AgroIntelligenceEntity,
    AgroIntelligenceFreshnessSignal,
    AgroIntelligenceRelationship,
    AgroIntelligenceSourceDocument,
    AgroIntelligenceVerificationClaim,
)
from app.db.models.integrations import PartnerInboundRecord
from app.db.repositories.agro_intelligence import AgroIntelligenceRepository, EntityDetailBundle
from app.modules.agro_intelligence.schema import ENTITY_TYPES

ENTITY_TYPE_BY_SUBJECT_TYPE = {
    "organization_profile": "organization",
    "person_profile": "person_actor",
    "farm_signal": "farm_unit",
    "market_signal": "market_location",
}

LEGAL_SUFFIXES = {
    "ltd",
    "limited",
    "llc",
    "company",
    "co",
    "corp",
    "corporation",
    "inc",
    "plc",
}

TRUST_ORDER = {"bronze": 1, "silver": 2, "gold": 3}
SOURCE_ORDER = {"C": 1, "B": 2, "A": 3}


@dataclass(slots=True)
class CandidateMatch:
    entity: AgroIntelligenceEntity
    score: int
    reasons: list[str]


@dataclass(slots=True)
class ResolutionRunResult:
    scanned_records: int = 0
    documents_created: int = 0
    entities_created: int = 0
    entities_merged: int = 0
    entities_flagged: int = 0
    relationships_created: int = 0
    claims_created: int = 0


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _parse_timestamp(raw: str | None, fallback: datetime) -> datetime:
    if not raw:
        return fallback
    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return fallback
    return _coerce_utc(parsed) or fallback


def _normalize_name(value: str) -> str:
    lowered = value.lower()
    cleaned = "".join(char if char.isalnum() or char.isspace() else " " for char in lowered)
    tokens = [token for token in cleaned.split() if token and token not in LEGAL_SUFFIXES]
    return " ".join(tokens)


def _tokenize(value: str) -> list[str]:
    return [token for token in _normalize_name(value).split() if token]


def _normalized_key(country_code: str, entity_type: str, name: str) -> str:
    return f"{country_code.upper()}::{entity_type}::{_normalize_name(name)}"


def _best_source_tier(left: str, right: str) -> str:
    return left if SOURCE_ORDER.get(left, 0) >= SOURCE_ORDER.get(right, 0) else right


def _trust_tier_for_score(score: int) -> str:
    if score >= 88:
        return "gold"
    if score >= 68:
        return "silver"
    return "bronze"


def _freshness_status(*, observed_at: datetime, stale_after_days: int, now: datetime) -> str:
    age_days = max(0, (now - observed_at).days)
    if age_days >= stale_after_days + 14:
        return "expired"
    if age_days >= stale_after_days:
        return "stale"
    if age_days >= max(7, stale_after_days // 2):
        return "watch"
    return "fresh"


def _merge_unique_dict_list(
    current: list[dict[str, Any]], incoming: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for item in [*current, *incoming]:
        fingerprint = sha1(repr(sorted(item.items())).encode("utf-8")).hexdigest()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        merged.append(item)
    return merged


def _merge_unique_str_list(current: list[str], incoming: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for item in [*current, *incoming]:
        if item in seen:
            continue
        seen.add(item)
        merged.append(item)
    return merged


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if isinstance(item, str)]


def _extract_primary_name(record: PartnerInboundRecord) -> str:
    payload = record.payload
    for key in (
        "canonical_name",
        "entity_name",
        "organization_name",
        "name",
        "display_name",
        "buyer_name",
        "processor_name",
        "facility_name",
    ):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return record.subject_ref.strip()


def _extract_entity_type(record: PartnerInboundRecord) -> str:
    payload_entity_type = record.payload.get("entity_type")
    if isinstance(payload_entity_type, str) and payload_entity_type in ENTITY_TYPES:
        return payload_entity_type
    return ENTITY_TYPE_BY_SUBJECT_TYPE.get(record.subject_type, "organization")


def _extract_location_signature(payload: dict[str, Any]) -> str:
    values = []
    for key in ("city", "district", "state", "region", "location"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            values.append(value.strip().lower())
    return "|".join(values[:3])


def _extract_commodity_tags(payload: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    for key in ("commodity", "commodity_focus", "commodity_name"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            tags.append(value.strip().lower())
    for key in ("commodities", "commodity_tags"):
        value = payload.get(key)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, str) and item.strip():
                    tags.append(item.strip().lower())
    return sorted({tag for tag in tags if tag})


def _derive_operator_tags(record: PartnerInboundRecord) -> list[str]:
    payload = record.payload
    tags: list[str] = []
    for key in ("operator_kind", "organization_kind", "directory_segment"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            tags.append(value.strip().lower())
    product = record.data_product.lower()
    if "buyer" in product:
        tags.append("buyer")
    if "processor" in product:
        tags.append("processor")
    if "warehouse" in product:
        tags.append("warehouse")
    if "transporter" in product:
        tags.append("transporter")
    return sorted(set(tags))


def _provenance_from_record(record: PartnerInboundRecord) -> dict[str, Any]:
    provenance = dict(record.provenance)
    provenance.setdefault("schema_version", "2026-04-29.eh5a")
    provenance.setdefault("source_tier", _best_source_tier("C", "C"))
    provenance.setdefault("boundary_ingest_id", record.ingest_id)
    provenance.setdefault("partner_slug", record.partner_slug)
    provenance.setdefault("adapter_key", record.adapter_key)
    provenance.setdefault("data_product", record.data_product)
    provenance.setdefault("confidence_weight", 60)
    return provenance


def _candidate_score(
    *,
    record: PartnerInboundRecord,
    existing: AgroIntelligenceEntity,
    incoming_name: str,
    incoming_location: str,
    incoming_commodities: list[str],
) -> CandidateMatch:
    score = 0
    reasons: list[str] = []
    normalized_incoming = _normalize_name(incoming_name)
    normalized_existing = _normalize_name(existing.canonical_name)
    if normalized_incoming == normalized_existing:
        score += 55
        reasons.append("normalized_name_exact")
    else:
        incoming_tokens = set(_tokenize(incoming_name))
        existing_tokens = set(_tokenize(existing.canonical_name))
        overlap = len(incoming_tokens & existing_tokens)
        union = len(incoming_tokens | existing_tokens)
        if union:
            token_score = int((overlap / union) * 35)
            if token_score:
                score += token_score
                reasons.append(f"name_token_overlap:{overlap}/{union}")

    existing_location = str(existing.attribute_payload.get("location_signature") or "")
    if incoming_location and existing_location and incoming_location == existing_location:
        score += 20
        reasons.append("location_signature_match")

    existing_commodities = {item.lower() for item in _string_list(existing.attribute_payload.get("commodity_tags", []))}
    commodity_overlap = len(existing_commodities & set(incoming_commodities))
    if commodity_overlap:
        score += min(15, commodity_overlap * 5)
        reasons.append(f"commodity_overlap:{commodity_overlap}")

    if existing.latest_partner_slug == record.partner_slug:
        score += 5
        reasons.append("same_partner_lane")

    if existing.latest_adapter_key == record.adapter_key:
        score += 5
        reasons.append("same_adapter_lane")

    score = min(100, score)
    return CandidateMatch(entity=existing, score=score, reasons=reasons)


class AgroIntelligenceRuntime:
    def __init__(self, repository: AgroIntelligenceRepository) -> None:
        self.repository = repository

    def run_resolution(
        self,
        *,
        country_code: str,
        partner_slug: str | None = None,
        limit: int = 200,
    ) -> ResolutionRunResult:
        result = ResolutionRunResult()
        records = self.repository.list_accepted_inbound_records(
            country_code=country_code,
            partner_slug=partner_slug,
            limit=limit,
        )
        now = self.repository.utcnow()
        for record in records:
            result.scanned_records += 1
            document, document_created = self._ensure_source_document(record=record)
            if document_created:
                result.documents_created += 1

            entity = self._resolve_record(record=record, document=document, now=now, result=result)
            self._refresh_freshness(entity=entity, observed_at=_parse_timestamp(
                str(record.provenance.get("collected_at") or record.created_at.isoformat()),
                _coerce_utc(record.created_at) or now,
            ), source_count=len(entity.provenance), now=now)
            self._ensure_supporting_relationships(
                entity=entity,
                record=record,
                document=document,
                now=now,
                result=result,
            )
        return result

    def _ensure_source_document(
        self, *, record: PartnerInboundRecord
    ) -> tuple[AgroIntelligenceSourceDocument, bool]:
        existing = self.repository.find_source_document_by_ingest_id(
            boundary_ingest_id=record.ingest_id
        )
        if existing is not None:
            return existing, False
        payload = dict(record.payload)
        document = AgroIntelligenceSourceDocument(
            document_id=f"source-{token_hex(8)}",
            source_id=str(record.provenance.get("source_id") or record.partner_record_id),
            source_tier=str(record.provenance.get("source_tier") or "C"),
            country_code=record.country_code,
            title=str(payload.get("title") or _extract_primary_name(record)),
            document_kind=self._document_kind_for_record(record),
            entity_refs=[],
            boundary_ingest_id=record.ingest_id,
            partner_slug=record.partner_slug,
            adapter_key=record.adapter_key,
            collected_at=_parse_timestamp(
                str(record.provenance.get("collected_at") or record.created_at.isoformat()),
                _coerce_utc(record.created_at) or self.repository.utcnow(),
            ),
            legal_basis=str(record.provenance.get("legal_basis") or "contractual_partner_feed"),
            checksum=str(record.provenance.get("checksum") or "") or None,
            metadata_json={
                "partner_record_id": record.partner_record_id,
                "data_product": record.data_product,
                "subject_type": record.subject_type,
            },
        )
        return self.repository.save_source_document(document), True

    def _document_kind_for_record(self, record: PartnerInboundRecord) -> str:
        adapter = record.adapter_key.lower()
        if "field" in adapter or "enumeration" in adapter:
            return "field_enumeration"
        if "registry" in adapter:
            return "registry_record"
        if "market" in adapter:
            return "market_feed"
        return "partner_upload"

    def _resolve_record(
        self,
        *,
        record: PartnerInboundRecord,
        document: AgroIntelligenceSourceDocument,
        now: datetime,
        result: ResolutionRunResult,
    ) -> AgroIntelligenceEntity:
        entity_type = _extract_entity_type(record)
        name = _extract_primary_name(record)
        location_signature = _extract_location_signature(record.payload)
        commodity_tags = _extract_commodity_tags(record.payload)
        operator_tags = _derive_operator_tags(record)
        normalized_tokens = _tokenize(name)
        candidates = [
            _candidate_score(
                record=record,
                existing=existing,
                incoming_name=name,
                incoming_location=location_signature,
                incoming_commodities=commodity_tags,
            )
            for existing in self.repository.list_candidate_entities(
                country_code=record.country_code,
                entity_type=entity_type,
                normalized_name_tokens=normalized_tokens,
            )
        ]
        candidates.sort(key=lambda item: item.score, reverse=True)
        top_candidate = candidates[0] if candidates else None
        second_score = candidates[1].score if len(candidates) > 1 else None
        should_merge = top_candidate is not None and top_candidate.score >= 82
        ambiguous = (
            top_candidate is not None
            and top_candidate.score >= 68
            and second_score is not None
            and abs(top_candidate.score - second_score) <= 8
        )

        if should_merge and top_candidate is not None:
            entity = top_candidate.entity
            result.entities_merged += 1
        else:
            entity = AgroIntelligenceEntity(
                entity_id=f"agri-entity-{token_hex(8)}",
                entity_type=entity_type,
                canonical_name=name,
                country_code=record.country_code,
                trust_tier="bronze",
                lifecycle_state="ingested",
                source_tier=str(record.provenance.get("source_tier") or "C"),
                confidence_score=0,
                boundary_subject_type=record.subject_type,
                latest_boundary_ingest_id=record.ingest_id,
                latest_partner_slug=record.partner_slug,
                latest_adapter_key=record.adapter_key,
                consent_artifact_id=None,
                provenance=[],
                attribute_payload={},
                is_demo_entity=False,
            )
            result.entities_created += 1

        if entity_type == "person_actor" and record.consent_artifact:
            consent_artifact = self._ensure_consent_artifact(record=record)
            entity.consent_artifact_id = consent_artifact.consent_artifact_id

        existing_source_document_ids = _string_list(
            entity.attribute_payload.get("source_document_ids", [])
        )
        resolution_evidence = {
            "normalized_key": _normalized_key(record.country_code, entity_type, name),
            "top_candidate_entity_id": top_candidate.entity.entity_id if top_candidate else None,
            "top_candidate_score": top_candidate.score if top_candidate else None,
            "top_candidate_reasons": top_candidate.reasons if top_candidate else [],
            "ambiguous_match": ambiguous,
            "candidate_count": len(candidates),
        }
        merged_payload = {
            **entity.attribute_payload,
            **record.payload,
            "normalized_name": _normalize_name(name),
            "location_signature": location_signature,
            "commodity_tags": _merge_unique_str_list(
                _string_list(entity.attribute_payload.get("commodity_tags", [])),
                commodity_tags,
            ),
            "operator_tags": _merge_unique_str_list(
                _string_list(entity.attribute_payload.get("operator_tags", [])),
                operator_tags,
            ),
            "source_document_ids": _merge_unique_str_list(
                existing_source_document_ids,
                [document.document_id],
            ),
            "resolution_evidence": resolution_evidence,
        }
        provenance_item = _provenance_from_record(record)
        merged_provenance = _merge_unique_dict_list(entity.provenance, [provenance_item])
        confidence_score = min(
            100,
            max(
                entity.confidence_score,
                self._confidence_score_for_entity(
                    source_tier=str(provenance_item.get("source_tier") or "C"),
                    source_count=len(merged_provenance),
                    duplicate_score=top_candidate.score if top_candidate else 58,
                    ambiguous=ambiguous,
                ),
            ),
        )

        entity.canonical_name = self._pick_canonical_name(
            current_name=entity.canonical_name,
            incoming_name=name,
            source_tier=str(provenance_item.get("source_tier") or "C"),
        )
        entity.source_tier = _best_source_tier(
            entity.source_tier,
            str(provenance_item.get("source_tier") or "C"),
        )
        entity.trust_tier = _trust_tier_for_score(confidence_score)
        entity.lifecycle_state = (
            "pending_verification"
            if ambiguous or confidence_score < 80
            else "matched_or_unmatched"
        )
        entity.confidence_score = confidence_score
        entity.boundary_subject_type = record.subject_type
        entity.latest_boundary_ingest_id = record.ingest_id
        entity.latest_partner_slug = record.partner_slug
        entity.latest_adapter_key = record.adapter_key
        entity.provenance = merged_provenance
        entity.attribute_payload = merged_payload
        saved = self.repository.save_entity(entity)

        if document.document_id not in document.entity_refs:
            document.entity_refs = _merge_unique_str_list(document.entity_refs, [saved.entity_id])
            self.repository.save_source_document(document)

        if ambiguous or confidence_score < 80:
            result.entities_flagged += 1
            self._create_pending_claim(
                entity=saved,
                document=document,
                record=record,
                now=now,
                claim_target="entity_resolution",
                result=result,
            )
        return saved

    def _ensure_consent_artifact(
        self, *, record: PartnerInboundRecord
    ) -> AgroIntelligenceConsentArtifact:
        if not record.consent_artifact:
            raise ValueError("person_actor resolution requires consent artifact")
        consent_id = f"consent-{record.ingest_id}"
        existing = self.repository.find_consent_artifact(consent_artifact_id=consent_id)
        captured_at = _parse_timestamp(
            str(record.consent_artifact.get("captured_at")),
            _coerce_utc(record.created_at) or self.repository.utcnow(),
        )
        revoked_at = _parse_timestamp(
            str(record.consent_artifact.get("revoked_at")),
            captured_at,
        ) if record.consent_artifact.get("revoked_at") else None
        if existing is None:
            existing = AgroIntelligenceConsentArtifact(
                consent_artifact_id=consent_id,
                subject_ref=str(record.consent_artifact.get("subject_ref") or record.subject_ref),
                country_code=str(record.consent_artifact.get("country_code") or record.country_code),
                status=str(record.consent_artifact.get("status") or "granted"),
                policy_version=str(record.consent_artifact.get("policy_version") or "2026.04"),
                scope_ids=_string_list(record.consent_artifact.get("scope_ids", [])),
                captured_at=captured_at,
                revoked_at=revoked_at,
                legal_basis=str(record.provenance.get("legal_basis") or "contractual_partner_feed"),
                boundary_ingest_id=record.ingest_id,
                partner_slug=record.partner_slug,
            )
        else:
            existing.status = str(record.consent_artifact.get("status") or existing.status)
            existing.policy_version = str(
                record.consent_artifact.get("policy_version") or existing.policy_version
            )
            existing.scope_ids = _string_list(
                record.consent_artifact.get("scope_ids", existing.scope_ids)
            )
            existing.captured_at = captured_at
            existing.revoked_at = revoked_at
            existing.boundary_ingest_id = record.ingest_id
            existing.partner_slug = record.partner_slug
        return self.repository.save_consent_artifact(existing)

    def _confidence_score_for_entity(
        self,
        *,
        source_tier: str,
        source_count: int,
        duplicate_score: int,
        ambiguous: bool,
    ) -> int:
        base = {"A": 78, "B": 66, "C": 54}.get(source_tier, 54)
        score = base + min(15, source_count * 4)
        if duplicate_score >= 82:
            score += 10
        elif duplicate_score >= 68:
            score += 4
        if ambiguous:
            score -= 14
        return max(25, min(96, score))

    def _pick_canonical_name(self, *, current_name: str, incoming_name: str, source_tier: str) -> str:
        if not current_name.strip():
            return incoming_name
        if SOURCE_ORDER.get(source_tier, 0) >= SOURCE_ORDER.get("B", 0) and len(incoming_name) > len(
            current_name
        ):
            return incoming_name
        return current_name

    def _create_pending_claim(
        self,
        *,
        entity: AgroIntelligenceEntity,
        document: AgroIntelligenceSourceDocument,
        record: PartnerInboundRecord,
        now: datetime,
        claim_target: str,
        result: ResolutionRunResult,
    ) -> None:
        existing_claims = self.repository.list_verification_claims(entity_ids=[entity.entity_id]).get(
            entity.entity_id, []
        )
        if any(
            claim.claim_target == claim_target and claim.claim_state == "pending"
            for claim in existing_claims
        ):
            return
        claim = AgroIntelligenceVerificationClaim(
            claim_id=f"claim-{token_hex(8)}",
            entity_id=entity.entity_id,
            source_document_id=document.document_id,
            claim_target=claim_target,
            claim_state="pending",
            verifier_type="rule_engine",
            trust_tier=entity.trust_tier,
            evidence_refs=[record.ingest_id, record.partner_record_id, claim_target],
            provenance=[_provenance_from_record(record)],
            occurred_at=now,
        )
        self.repository.save_verification_claim(claim)
        result.claims_created += 1

    def _refresh_freshness(
        self,
        *,
        entity: AgroIntelligenceEntity,
        observed_at: datetime,
        source_count: int,
        now: datetime,
    ) -> AgroIntelligenceFreshnessSignal:
        stale_after_days = {"A": 45, "B": 30, "C": 21}.get(entity.source_tier, 21)
        status = _freshness_status(
            observed_at=observed_at,
            stale_after_days=stale_after_days,
            now=now,
        )
        signal = self.repository.list_freshness_signals(entity_ids=[entity.entity_id]).get(entity.entity_id)
        expires_at = observed_at + timedelta(days=stale_after_days)
        provenance = {
            "schema_version": "2026-04-29.eh5a",
            "source_id": "agro_intelligence_runtime",
            "source_tier": entity.source_tier,
            "collected_at": now.isoformat().replace("+00:00", "Z"),
            "collection_method": "entity_resolution_runtime",
            "legal_basis": "internal_quality_control",
            "confidence_weight": max(40, entity.confidence_score),
        }
        if signal is None:
            signal = AgroIntelligenceFreshnessSignal(
                signal_id=f"signal-{token_hex(8)}",
                entity_id=entity.entity_id,
                freshness_status=status,
                source_count=source_count,
                stale_after_days=stale_after_days,
                observed_at=observed_at,
                expires_at=expires_at,
                provenance=[provenance],
            )
        else:
            signal.freshness_status = status
            signal.source_count = source_count
            signal.stale_after_days = stale_after_days
            signal.observed_at = observed_at
            signal.expires_at = expires_at
            signal.provenance = _merge_unique_dict_list(signal.provenance, [provenance])
        if status in {"stale", "expired"}:
            entity.lifecycle_state = "stale"
            self.repository.save_entity(entity)
        return self.repository.save_freshness_signal(signal)

    def _ensure_supporting_relationships(
        self,
        *,
        entity: AgroIntelligenceEntity,
        record: PartnerInboundRecord,
        document: AgroIntelligenceSourceDocument,
        now: datetime,
        result: ResolutionRunResult,
    ) -> None:
        payload = record.payload
        link_specs = [
            ("facility_name", "facility", "operates"),
            ("parent_name", "organization", "belongs_to"),
            ("commodity_name", "commodity_profile", "trades"),
        ]
        for field_name, target_entity_type, relationship_type in link_specs:
            raw_value = payload.get(field_name)
            if not isinstance(raw_value, str) or not raw_value.strip():
                continue
            related_entity = self._get_or_create_related_entity(
                country_code=record.country_code,
                entity_type=target_entity_type,
                canonical_name=raw_value.strip(),
                partner_slug=record.partner_slug,
                adapter_key=record.adapter_key,
                document=document,
                now=now,
            )
            relationship = self.repository.find_relationship(
                source_entity_id=entity.entity_id,
                target_entity_id=related_entity.entity_id,
                relationship_type=relationship_type,
            )
            if relationship is None:
                relationship = AgroIntelligenceRelationship(
                    relationship_id=f"relationship-{token_hex(8)}",
                    source_entity_id=entity.entity_id,
                    target_entity_id=related_entity.entity_id,
                    relationship_type=relationship_type,
                    trust_tier=min(entity.trust_tier, related_entity.trust_tier, key=lambda item: TRUST_ORDER[item]),
                    lifecycle_state="matched_or_unmatched",
                    provenance=[_provenance_from_record(record)],
                    attribute_payload={
                        "source_document_id": document.document_id,
                        "origin_field": field_name,
                    },
                )
                self.repository.save_relationship(relationship)
                result.relationships_created += 1

    def _get_or_create_related_entity(
        self,
        *,
        country_code: str,
        entity_type: str,
        canonical_name: str,
        partner_slug: str,
        adapter_key: str,
        document: AgroIntelligenceSourceDocument,
        now: datetime,
    ) -> AgroIntelligenceEntity:
        tokens = _tokenize(canonical_name)
        candidates = self.repository.list_candidate_entities(
            country_code=country_code,
            entity_type=entity_type,
            normalized_name_tokens=tokens,
        )
        for candidate in candidates:
            if _normalize_name(candidate.canonical_name) == _normalize_name(canonical_name):
                return candidate
        entity = AgroIntelligenceEntity(
            entity_id=f"agri-entity-{token_hex(8)}",
            entity_type=entity_type,
            canonical_name=canonical_name,
            country_code=country_code,
            trust_tier="bronze",
            lifecycle_state="matched_or_unmatched",
            source_tier=document.source_tier,
            confidence_score=58,
            boundary_subject_type="organization_profile" if entity_type in {"organization", "facility"} else "market_signal",
            latest_boundary_ingest_id=document.boundary_ingest_id,
            latest_partner_slug=partner_slug,
            latest_adapter_key=adapter_key,
            consent_artifact_id=None,
            provenance=[
                {
                    "schema_version": "2026-04-29.eh5a",
                    "source_id": document.source_id,
                    "source_tier": document.source_tier,
                    "collected_at": document.collected_at.isoformat().replace("+00:00", "Z"),
                    "collection_method": "derived_relationship_entity",
                    "legal_basis": document.legal_basis,
                    "boundary_ingest_id": document.boundary_ingest_id,
                    "partner_slug": partner_slug,
                    "adapter_key": adapter_key,
                    "data_product": document.metadata_json.get("data_product"),
                    "confidence_weight": 58,
                }
            ],
            attribute_payload={
                "normalized_name": _normalize_name(canonical_name),
                "source_document_ids": [document.document_id],
            },
            is_demo_entity=False,
        )
        saved = self.repository.save_entity(entity)
        self._refresh_freshness(
            entity=saved,
            observed_at=document.collected_at,
            source_count=1,
            now=now,
        )
        return saved

    def build_overview(self, *, country_code: str) -> dict[str, Any]:
        entities = self.repository.list_entities(country_code=country_code, limit=500)
        freshness_by_entity = self.repository.list_freshness_signals(
            entity_ids=[entity.entity_id for entity in entities]
        )
        queue_items = self.build_verification_queue(country_code=country_code)
        buyer_like_entities = [
            entity
            for entity in entities
            if "buyer" in {item.lower() for item in _string_list(entity.attribute_payload.get("operator_tags", []))}
            or (
                entity.entity_type == "organization"
                and any(
                    tag in {"processor", "offtaker"}
                    for tag in _string_list(entity.attribute_payload.get("operator_tags", []))
                )
            )
        ]
        trust_counts = {"bronze": 0, "silver": 0, "gold": 0}
        freshness_counts = {"fresh": 0, "watch": 0, "stale": 0, "expired": 0}
        for entity in entities:
            trust_counts[entity.trust_tier] = trust_counts.get(entity.trust_tier, 0) + 1
            freshness = freshness_by_entity.get(entity.entity_id)
            if freshness:
                freshness_counts[freshness.freshness_status] = (
                    freshness_counts.get(freshness.freshness_status, 0) + 1
                )
        return {
            "country_code": country_code,
            "entity_count": len(entities),
            "buyer_directory_count": len(buyer_like_entities),
            "verification_queue_count": len(queue_items),
            "trust_counts": trust_counts,
            "freshness_counts": freshness_counts,
            "top_buyers": [
                self.serialize_entity_summary(
                    entity=entity,
                    freshness_signal=freshness_by_entity.get(entity.entity_id),
                    verification_claims=self.repository.list_verification_claims(
                        entity_ids=[entity.entity_id]
                    ).get(entity.entity_id, []),
                )
                for entity in sorted(
                    buyer_like_entities,
                    key=lambda item: (item.confidence_score, item.updated_at),
                    reverse=True,
                )[:6]
            ],
        }

    def build_verification_queue(self, *, country_code: str) -> list[dict[str, Any]]:
        entities = self.repository.list_entities(country_code=country_code, limit=500)
        freshness_by_entity = self.repository.list_freshness_signals(
            entity_ids=[entity.entity_id for entity in entities]
        )
        claims_by_entity = self.repository.list_verification_claims(
            entity_ids=[entity.entity_id for entity in entities]
        )
        items: list[dict[str, Any]] = []
        now = self.repository.utcnow()
        for entity in entities:
            reasons: list[str] = []
            priority = 0
            resolution_evidence = entity.attribute_payload.get("resolution_evidence", {})
            if isinstance(resolution_evidence, dict) and resolution_evidence.get("ambiguous_match"):
                reasons.append("ambiguous_duplicate_candidate")
                priority += 35
            if entity.confidence_score < 80:
                reasons.append("low_confidence_score")
                priority += 20
            freshness = freshness_by_entity.get(entity.entity_id)
            if freshness and freshness.freshness_status in {"watch", "stale", "expired"}:
                reasons.append(f"freshness_{freshness.freshness_status}")
                priority += {"watch": 10, "stale": 25, "expired": 35}[freshness.freshness_status]
            pending_claims = [
                claim
                for claim in claims_by_entity.get(entity.entity_id, [])
                if claim.claim_state == "pending"
            ]
            if pending_claims:
                reasons.append("pending_rule_claim")
                priority += 15
            if entity.lifecycle_state in {"pending_verification", "stale", "rejected"}:
                priority += 10
            if not reasons:
                continue
            items.append(
                {
                    "entity_id": entity.entity_id,
                    "canonical_name": entity.canonical_name,
                    "entity_type": entity.entity_type,
                    "country_code": entity.country_code,
                    "trust_tier": entity.trust_tier,
                    "confidence_score": entity.confidence_score,
                    "lifecycle_state": entity.lifecycle_state,
                    "freshness_status": freshness.freshness_status if freshness else "fresh",
                    "priority_score": min(100, priority),
                    "reasons": reasons,
                    "operator_tags": _string_list(entity.attribute_payload.get("operator_tags", [])),
                    "updated_at": (_coerce_utc(entity.updated_at) or _coerce_utc(entity.created_at) or now)
                    .isoformat()
                    .replace("+00:00", "Z"),
                }
            )
        return sorted(items, key=lambda item: (item["priority_score"], item["updated_at"]), reverse=True)

    def apply_verification_decision(
        self,
        *,
        entity_id: str,
        action: str,
        actor_id: str,
    ) -> dict[str, Any]:
        bundle = self.repository.get_entity_detail_bundle(entity_id=entity_id)
        if bundle is None:
            raise KeyError("entity_not_found")
        entity = bundle.entity
        now = self.repository.utcnow()
        if action == "approve":
            entity.lifecycle_state = "verified"
            entity.trust_tier = "gold" if entity.confidence_score >= 85 else "silver"
            claim_state = "confirmed"
        elif action == "reject":
            entity.lifecycle_state = "rejected"
            entity.trust_tier = "bronze"
            claim_state = "rejected"
        elif action == "mark_stale":
            entity.lifecycle_state = "stale"
            claim_state = "confirmed"
        else:
            raise ValueError("unsupported_decision")
        self.repository.save_entity(entity)
        claim = AgroIntelligenceVerificationClaim(
            claim_id=f"claim-{token_hex(8)}",
            entity_id=entity.entity_id,
            source_document_id=bundle.source_documents[0].document_id if bundle.source_documents else None,
            claim_target="operator_decision",
            claim_state=claim_state,
            verifier_type="human_operator",
            trust_tier=entity.trust_tier,
            evidence_refs=[actor_id, action],
            provenance=[
                {
                    "schema_version": "2026-04-29.eh5a",
                    "source_id": f"operator:{actor_id}",
                    "source_tier": entity.source_tier,
                    "collected_at": now.isoformat().replace("+00:00", "Z"),
                    "collection_method": "operator_console_review",
                    "legal_basis": "internal_quality_control",
                    "confidence_weight": max(65, entity.confidence_score),
                }
            ],
            occurred_at=now,
        )
        self.repository.save_verification_claim(claim)
        freshness = bundle.freshness_signal
        if freshness is not None and action == "mark_stale":
            freshness.freshness_status = "stale"
            freshness.observed_at = now - timedelta(days=freshness.stale_after_days)
            freshness.expires_at = now
            self.repository.save_freshness_signal(freshness)
        return self.serialize_entity_detail(
            bundle=self.repository.get_entity_detail_bundle(entity_id=entity.entity_id)
        )

    def serialize_entity_summary(
        self,
        *,
        entity: AgroIntelligenceEntity,
        freshness_signal: AgroIntelligenceFreshnessSignal | None,
        verification_claims: list[AgroIntelligenceVerificationClaim],
    ) -> dict[str, Any]:
        return {
            "entity_id": entity.entity_id,
            "canonical_name": entity.canonical_name,
            "entity_type": entity.entity_type,
            "country_code": entity.country_code,
            "trust_tier": entity.trust_tier,
            "lifecycle_state": entity.lifecycle_state,
            "source_tier": entity.source_tier,
            "confidence_score": entity.confidence_score,
            "freshness_status": freshness_signal.freshness_status if freshness_signal else "fresh",
            "operator_tags": _string_list(entity.attribute_payload.get("operator_tags", [])),
            "commodity_tags": _string_list(entity.attribute_payload.get("commodity_tags", [])),
            "location_signature": str(entity.attribute_payload.get("location_signature") or ""),
            "source_document_count": len(_string_list(entity.attribute_payload.get("source_document_ids", []))),
            "pending_claim_count": sum(
                1 for claim in verification_claims if claim.claim_state == "pending"
            ),
            "updated_at": (
                _coerce_utc(entity.updated_at) or _coerce_utc(entity.created_at) or self.repository.utcnow()
            )
            .isoformat()
            .replace("+00:00", "Z"),
        }

    def serialize_entity_detail(self, *, bundle: EntityDetailBundle | None) -> dict[str, Any]:
        if bundle is None:
            raise KeyError("entity_not_found")
        entity = bundle.entity
        related_ids = {
            relationship.target_entity_id for relationship in bundle.outgoing_relationships
        } | {relationship.source_entity_id for relationship in bundle.incoming_relationships}
        related_entities = {
            item.entity_id: item
            for item in self.repository.list_entities(country_code=entity.country_code, limit=500)
            if item.entity_id in related_ids
        }
        return {
            **self.serialize_entity_summary(
                entity=entity,
                freshness_signal=bundle.freshness_signal,
                verification_claims=bundle.verification_claims,
            ),
            "consent_artifact": (
                {
                    "consent_artifact_id": bundle.consent_artifact.consent_artifact_id,
                    "status": bundle.consent_artifact.status,
                    "policy_version": bundle.consent_artifact.policy_version,
                    "scope_ids": bundle.consent_artifact.scope_ids,
                    "captured_at": bundle.consent_artifact.captured_at.isoformat().replace("+00:00", "Z"),
                    "revoked_at": (
                        bundle.consent_artifact.revoked_at.isoformat().replace("+00:00", "Z")
                        if bundle.consent_artifact.revoked_at
                        else None
                    ),
                }
                if bundle.consent_artifact
                else None
            ),
            "attribute_payload": entity.attribute_payload,
            "provenance": entity.provenance,
            "freshness": (
                {
                    "signal_id": bundle.freshness_signal.signal_id,
                    "freshness_status": bundle.freshness_signal.freshness_status,
                    "source_count": bundle.freshness_signal.source_count,
                    "stale_after_days": bundle.freshness_signal.stale_after_days,
                    "observed_at": bundle.freshness_signal.observed_at.isoformat().replace("+00:00", "Z"),
                    "expires_at": bundle.freshness_signal.expires_at.isoformat().replace("+00:00", "Z"),
                    "provenance": bundle.freshness_signal.provenance,
                }
                if bundle.freshness_signal
                else None
            ),
            "source_documents": [
                {
                    "document_id": document.document_id,
                    "source_id": document.source_id,
                    "source_tier": document.source_tier,
                    "title": document.title,
                    "document_kind": document.document_kind,
                    "entity_refs": document.entity_refs,
                    "boundary_ingest_id": document.boundary_ingest_id,
                    "partner_slug": document.partner_slug,
                    "adapter_key": document.adapter_key,
                    "collected_at": document.collected_at.isoformat().replace("+00:00", "Z"),
                    "legal_basis": document.legal_basis,
                    "checksum": document.checksum,
                    "metadata_json": document.metadata_json,
                }
                for document in bundle.source_documents
            ],
            "verification_claims": [
                {
                    "claim_id": claim.claim_id,
                    "claim_target": claim.claim_target,
                    "claim_state": claim.claim_state,
                    "verifier_type": claim.verifier_type,
                    "trust_tier": claim.trust_tier,
                    "evidence_refs": claim.evidence_refs,
                    "provenance": claim.provenance,
                    "occurred_at": claim.occurred_at.isoformat().replace("+00:00", "Z"),
                }
                for claim in bundle.verification_claims
            ],
            "relationships": [
                {
                    "relationship_id": relationship.relationship_id,
                    "direction": "outgoing",
                    "relationship_type": relationship.relationship_type,
                    "other_entity_id": relationship.target_entity_id,
                    "other_entity_name": related_entities[relationship.target_entity_id].canonical_name
                    if relationship.target_entity_id in related_entities
                    else relationship.target_entity_id,
                    "trust_tier": relationship.trust_tier,
                    "lifecycle_state": relationship.lifecycle_state,
                    "attribute_payload": relationship.attribute_payload,
                    "provenance": relationship.provenance,
                }
                for relationship in bundle.outgoing_relationships
            ]
            + [
                {
                    "relationship_id": relationship.relationship_id,
                    "direction": "incoming",
                    "relationship_type": relationship.relationship_type,
                    "other_entity_id": relationship.source_entity_id,
                    "other_entity_name": related_entities[relationship.source_entity_id].canonical_name
                    if relationship.source_entity_id in related_entities
                    else relationship.source_entity_id,
                    "trust_tier": relationship.trust_tier,
                    "lifecycle_state": relationship.lifecycle_state,
                    "attribute_payload": relationship.attribute_payload,
                    "provenance": relationship.provenance,
                }
                for relationship in bundle.incoming_relationships
            ],
        }
