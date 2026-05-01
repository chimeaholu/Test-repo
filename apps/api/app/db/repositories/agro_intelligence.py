from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models.agro_intelligence import (
    AgroIntelligenceConsentArtifact,
    AgroIntelligenceEntity,
    AgroIntelligenceFreshnessSignal,
    AgroIntelligenceRelationship,
    AgroIntelligenceSourceDocument,
    AgroIntelligenceVerificationClaim,
)
from app.db.models.integrations import PartnerInboundRecord


@dataclass(slots=True)
class EntityDetailBundle:
    entity: AgroIntelligenceEntity
    consent_artifact: AgroIntelligenceConsentArtifact | None
    freshness_signal: AgroIntelligenceFreshnessSignal | None
    source_documents: list[AgroIntelligenceSourceDocument]
    verification_claims: list[AgroIntelligenceVerificationClaim]
    outgoing_relationships: list[AgroIntelligenceRelationship]
    incoming_relationships: list[AgroIntelligenceRelationship]


class AgroIntelligenceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_accepted_inbound_records(
        self,
        *,
        country_code: str | None = None,
        partner_slug: str | None = None,
        limit: int = 200,
    ) -> list[PartnerInboundRecord]:
        statement = select(PartnerInboundRecord).where(
            PartnerInboundRecord.status == "accepted"
        )
        if country_code:
            statement = statement.where(PartnerInboundRecord.country_code == country_code)
        if partner_slug:
            statement = statement.where(PartnerInboundRecord.partner_slug == partner_slug)
        statement = statement.order_by(
            PartnerInboundRecord.created_at.asc(),
            PartnerInboundRecord.id.asc(),
        ).limit(limit)
        return list(self.session.execute(statement).scalars().all())

    def find_consent_artifact(self, *, consent_artifact_id: str) -> AgroIntelligenceConsentArtifact | None:
        statement = select(AgroIntelligenceConsentArtifact).where(
            AgroIntelligenceConsentArtifact.consent_artifact_id == consent_artifact_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def save_consent_artifact(self, artifact: AgroIntelligenceConsentArtifact) -> AgroIntelligenceConsentArtifact:
        self.session.add(artifact)
        self.session.flush()
        return artifact

    def find_source_document_by_ingest_id(
        self, *, boundary_ingest_id: str
    ) -> AgroIntelligenceSourceDocument | None:
        statement = select(AgroIntelligenceSourceDocument).where(
            AgroIntelligenceSourceDocument.boundary_ingest_id == boundary_ingest_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def save_source_document(
        self, document: AgroIntelligenceSourceDocument
    ) -> AgroIntelligenceSourceDocument:
        self.session.add(document)
        self.session.flush()
        return document

    def upsert_source_document(
        self,
        *,
        document_id: str,
        source_id: str,
        source_tier: str,
        country_code: str,
        title: str,
        document_kind: str,
        entity_refs: list[str],
        boundary_ingest_id: str | None,
        partner_slug: str | None,
        adapter_key: str | None,
        collected_at: datetime,
        legal_basis: str,
        checksum: str | None,
        metadata_json: dict[str, object],
    ) -> AgroIntelligenceSourceDocument:
        record = self.session.get(AgroIntelligenceSourceDocument, document_id)
        if record is None:
            record = AgroIntelligenceSourceDocument(
                document_id=document_id,
                source_id=source_id,
                source_tier=source_tier,
                country_code=country_code,
                title=title,
                document_kind=document_kind,
                entity_refs=entity_refs,
                boundary_ingest_id=boundary_ingest_id,
                partner_slug=partner_slug,
                adapter_key=adapter_key,
                collected_at=collected_at,
                legal_basis=legal_basis,
                checksum=checksum,
                metadata_json=metadata_json,
            )
        else:
            record.source_id = source_id
            record.source_tier = source_tier
            record.country_code = country_code
            record.title = title
            record.document_kind = document_kind
            record.entity_refs = entity_refs
            record.boundary_ingest_id = boundary_ingest_id
            record.partner_slug = partner_slug
            record.adapter_key = adapter_key
            record.collected_at = collected_at
            record.legal_basis = legal_basis
            record.checksum = checksum
            record.metadata_json = metadata_json
        return self.save_source_document(record)

    def list_entities(
        self,
        *,
        country_code: str,
        search: str | None = None,
        entity_type: str | None = None,
        trust_tier: str | None = None,
        lifecycle_state: str | None = None,
        source_tier: str | None = None,
        limit: int = 200,
    ) -> list[AgroIntelligenceEntity]:
        statement = select(AgroIntelligenceEntity).where(
            AgroIntelligenceEntity.country_code == country_code
        )
        if entity_type:
            statement = statement.where(AgroIntelligenceEntity.entity_type == entity_type)
        if trust_tier:
            statement = statement.where(AgroIntelligenceEntity.trust_tier == trust_tier)
        if lifecycle_state:
            statement = statement.where(AgroIntelligenceEntity.lifecycle_state == lifecycle_state)
        if source_tier:
            statement = statement.where(AgroIntelligenceEntity.source_tier == source_tier)
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    AgroIntelligenceEntity.canonical_name.ilike(pattern),
                    AgroIntelligenceEntity.entity_id.ilike(pattern),
                )
            )
        statement = statement.order_by(
            AgroIntelligenceEntity.updated_at.desc(),
        ).limit(limit)
        return list(self.session.execute(statement).scalars().all())

    def list_candidate_entities(
        self,
        *,
        country_code: str,
        entity_type: str,
        normalized_name_tokens: list[str],
    ) -> list[AgroIntelligenceEntity]:
        statement = select(AgroIntelligenceEntity).where(
            AgroIntelligenceEntity.country_code == country_code,
            AgroIntelligenceEntity.entity_type == entity_type,
        )
        if normalized_name_tokens:
            statement = statement.where(
                or_(
                    *[
                        AgroIntelligenceEntity.canonical_name.ilike(f"%{token}%")
                        for token in normalized_name_tokens[:3]
                    ]
                )
            )
        statement = statement.order_by(
            AgroIntelligenceEntity.updated_at.desc(),
        ).limit(50)
        return list(self.session.execute(statement).scalars().all())

    def find_entity(self, *, entity_id: str) -> AgroIntelligenceEntity | None:
        statement = select(AgroIntelligenceEntity).where(
            AgroIntelligenceEntity.entity_id == entity_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def save_entity(self, entity: AgroIntelligenceEntity) -> AgroIntelligenceEntity:
        self.session.add(entity)
        self.session.flush()
        return entity

    def upsert_entity(
        self,
        *,
        entity_id: str,
        entity_type: str,
        canonical_name: str,
        country_code: str,
        trust_tier: str,
        lifecycle_state: str,
        source_tier: str,
        confidence_score: int,
        boundary_subject_type: str | None,
        latest_boundary_ingest_id: str | None,
        latest_partner_slug: str | None,
        latest_adapter_key: str | None,
        consent_artifact_id: str | None,
        provenance: list[dict[str, object]],
        attribute_payload: dict[str, object],
        is_demo_entity: bool,
    ) -> AgroIntelligenceEntity:
        record = self.find_entity(entity_id=entity_id)
        if record is None:
            record = AgroIntelligenceEntity(
                entity_id=entity_id,
                entity_type=entity_type,
                canonical_name=canonical_name,
                country_code=country_code,
                trust_tier=trust_tier,
                lifecycle_state=lifecycle_state,
                source_tier=source_tier,
                confidence_score=confidence_score,
                boundary_subject_type=boundary_subject_type,
                latest_boundary_ingest_id=latest_boundary_ingest_id,
                latest_partner_slug=latest_partner_slug,
                latest_adapter_key=latest_adapter_key,
                consent_artifact_id=consent_artifact_id,
                provenance=provenance,
                attribute_payload=attribute_payload,
                is_demo_entity=is_demo_entity,
            )
        else:
            record.entity_type = entity_type
            record.canonical_name = canonical_name
            record.country_code = country_code
            record.trust_tier = trust_tier
            record.lifecycle_state = lifecycle_state
            record.source_tier = source_tier
            record.confidence_score = confidence_score
            record.boundary_subject_type = boundary_subject_type
            record.latest_boundary_ingest_id = latest_boundary_ingest_id
            record.latest_partner_slug = latest_partner_slug
            record.latest_adapter_key = latest_adapter_key
            record.consent_artifact_id = consent_artifact_id
            record.provenance = provenance
            record.attribute_payload = attribute_payload
            record.is_demo_entity = is_demo_entity
        return self.save_entity(record)

    def list_freshness_signals(
        self, *, entity_ids: list[str]
    ) -> dict[str, AgroIntelligenceFreshnessSignal]:
        if not entity_ids:
            return {}
        rows = self.session.execute(
            select(AgroIntelligenceFreshnessSignal)
            .where(AgroIntelligenceFreshnessSignal.entity_id.in_(entity_ids))
            .order_by(
                AgroIntelligenceFreshnessSignal.observed_at.desc(),
            )
        ).scalars()
        by_entity: dict[str, AgroIntelligenceFreshnessSignal] = {}
        for row in rows:
            by_entity.setdefault(row.entity_id, row)
        return by_entity

    def save_freshness_signal(
        self, signal: AgroIntelligenceFreshnessSignal
    ) -> AgroIntelligenceFreshnessSignal:
        self.session.add(signal)
        self.session.flush()
        return signal

    def list_verification_claims(
        self, *, entity_ids: list[str]
    ) -> dict[str, list[AgroIntelligenceVerificationClaim]]:
        if not entity_ids:
            return {}
        rows = list(
            self.session.execute(
                select(AgroIntelligenceVerificationClaim)
                .where(AgroIntelligenceVerificationClaim.entity_id.in_(entity_ids))
                .order_by(
                    AgroIntelligenceVerificationClaim.occurred_at.desc(),
                )
            ).scalars()
        )
        by_entity: dict[str, list[AgroIntelligenceVerificationClaim]] = defaultdict(list)
        for row in rows:
            by_entity[row.entity_id].append(row)
        return dict(by_entity)

    def save_verification_claim(
        self, claim: AgroIntelligenceVerificationClaim
    ) -> AgroIntelligenceVerificationClaim:
        self.session.add(claim)
        self.session.flush()
        return claim

    def find_relationship(
        self,
        *,
        source_entity_id: str,
        target_entity_id: str,
        relationship_type: str,
    ) -> AgroIntelligenceRelationship | None:
        statement = select(AgroIntelligenceRelationship).where(
            AgroIntelligenceRelationship.source_entity_id == source_entity_id,
            AgroIntelligenceRelationship.target_entity_id == target_entity_id,
            AgroIntelligenceRelationship.relationship_type == relationship_type,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def save_relationship(
        self, relationship: AgroIntelligenceRelationship
    ) -> AgroIntelligenceRelationship:
        self.session.add(relationship)
        self.session.flush()
        return relationship

    def get_entity_detail_bundle(self, *, entity_id: str) -> EntityDetailBundle | None:
        entity = self.find_entity(entity_id=entity_id)
        if entity is None:
            return None
        consent_artifact = None
        if entity.consent_artifact_id:
            consent_artifact = self.find_consent_artifact(
                consent_artifact_id=entity.consent_artifact_id
            )
        raw_source_document_ids = entity.attribute_payload.get("source_document_ids", [])
        source_document_ids = (
            [str(item) for item in raw_source_document_ids if isinstance(item, str)]
            if isinstance(raw_source_document_ids, list)
            else []
        )
        source_documents: list[AgroIntelligenceSourceDocument] = []
        if source_document_ids:
            source_documents = list(
                self.session.execute(
                    select(AgroIntelligenceSourceDocument).where(
                        AgroIntelligenceSourceDocument.document_id.in_(source_document_ids)
                    )
                ).scalars()
            )
        freshness_signal = self.list_freshness_signals(entity_ids=[entity_id]).get(entity_id)
        verification_claims = self.list_verification_claims(entity_ids=[entity_id]).get(
            entity_id, []
        )
        outgoing_relationships = list(
            self.session.execute(
                select(AgroIntelligenceRelationship)
                .where(AgroIntelligenceRelationship.source_entity_id == entity_id)
                .order_by(
                    AgroIntelligenceRelationship.updated_at.desc(),
                )
            ).scalars()
        )
        incoming_relationships = list(
            self.session.execute(
                select(AgroIntelligenceRelationship)
                .where(AgroIntelligenceRelationship.target_entity_id == entity_id)
                .order_by(
                    AgroIntelligenceRelationship.updated_at.desc(),
                )
            ).scalars()
        )
        return EntityDetailBundle(
            entity=entity,
            consent_artifact=consent_artifact,
            freshness_signal=freshness_signal,
            source_documents=source_documents,
            verification_claims=verification_claims,
            outgoing_relationships=outgoing_relationships,
            incoming_relationships=incoming_relationships,
        )

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(tz=UTC)
    def upsert_consent_artifact(
        self,
        *,
        consent_artifact_id: str,
        subject_ref: str,
        country_code: str,
        status: str,
        policy_version: str,
        scope_ids: list[str],
        captured_at: datetime,
        revoked_at: datetime | None,
        legal_basis: str,
        boundary_ingest_id: str | None,
        partner_slug: str | None,
    ) -> AgroIntelligenceConsentArtifact:
        record = self.find_consent_artifact(consent_artifact_id=consent_artifact_id)
        if record is None:
            record = AgroIntelligenceConsentArtifact(
                consent_artifact_id=consent_artifact_id,
                subject_ref=subject_ref,
                country_code=country_code,
                status=status,
                policy_version=policy_version,
                scope_ids=scope_ids,
                captured_at=captured_at,
                revoked_at=revoked_at,
                legal_basis=legal_basis,
                boundary_ingest_id=boundary_ingest_id,
                partner_slug=partner_slug,
            )
        else:
            record.subject_ref = subject_ref
            record.country_code = country_code
            record.status = status
            record.policy_version = policy_version
            record.scope_ids = scope_ids
            record.captured_at = captured_at
            record.revoked_at = revoked_at
            record.legal_basis = legal_basis
            record.boundary_ingest_id = boundary_ingest_id
            record.partner_slug = partner_slug
        return self.save_consent_artifact(record)
