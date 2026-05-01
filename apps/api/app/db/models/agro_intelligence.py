from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import PlatformBase


class AgroIntelligenceConsentArtifact(PlatformBase):
    __tablename__ = "agro_intelligence_consent_artifacts"
    __table_args__ = (
        CheckConstraint(
            "status != 'revoked' OR revoked_at IS NOT NULL",
            name="revoked_requires_timestamp",
        ),
    )

    consent_artifact_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    subject_ref: Mapped[str] = mapped_column(String(120), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    legal_basis: Mapped[str] = mapped_column(String(80), nullable=False)
    boundary_ingest_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    partner_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgroIntelligenceEntity(PlatformBase):
    __tablename__ = "agro_intelligence_entities"
    __table_args__ = (
        CheckConstraint(
            "entity_type != 'person_actor' OR consent_artifact_id IS NOT NULL",
            name="person_actor_consent_artifact_required",
        ),
        CheckConstraint(
            "confidence_score >= 0 AND confidence_score <= 100",
            name="confidence_score_range",
        ),
    )

    entity_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    canonical_name: Mapped[str] = mapped_column(String(160), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    trust_tier: Mapped[str] = mapped_column(String(16), nullable=False)
    lifecycle_state: Mapped[str] = mapped_column(String(32), nullable=False)
    source_tier: Mapped[str] = mapped_column(String(1), nullable=False)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)
    boundary_subject_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latest_boundary_ingest_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    latest_partner_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    latest_adapter_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    consent_artifact_id: Mapped[str | None] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_consent_artifacts.consent_artifact_id"),
        nullable=True,
    )
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    attribute_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    is_demo_entity: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgroIntelligenceSourceDocument(PlatformBase):
    __tablename__ = "agro_intelligence_source_documents"

    document_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(120), nullable=False)
    source_tier: Mapped[str] = mapped_column(String(1), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_refs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    boundary_ingest_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    partner_slug: Mapped[str | None] = mapped_column(String(80), nullable=True)
    adapter_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    legal_basis: Mapped[str] = mapped_column(String(80), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AgroIntelligenceRelationship(PlatformBase):
    __tablename__ = "agro_intelligence_relationships"
    __table_args__ = (
        UniqueConstraint(
            "source_entity_id",
            "target_entity_id",
            "relationship_type",
            name="uq_agro_intelligence_relationships_edge",
        ),
    )

    relationship_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    source_entity_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_entities.entity_id"),
        nullable=False,
    )
    target_entity_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_entities.entity_id"),
        nullable=False,
    )
    relationship_type: Mapped[str] = mapped_column(String(32), nullable=False)
    trust_tier: Mapped[str] = mapped_column(String(16), nullable=False)
    lifecycle_state: Mapped[str] = mapped_column(String(32), nullable=False)
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    attribute_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgroIntelligenceVerificationClaim(PlatformBase):
    __tablename__ = "agro_intelligence_verification_claims"

    claim_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    entity_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_entities.entity_id"),
        nullable=False,
    )
    source_document_id: Mapped[str | None] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_source_documents.document_id"),
        nullable=True,
    )
    claim_target: Mapped[str] = mapped_column(String(160), nullable=False)
    claim_state: Mapped[str] = mapped_column(String(32), nullable=False)
    verifier_type: Mapped[str] = mapped_column(String(32), nullable=False)
    trust_tier: Mapped[str] = mapped_column(String(16), nullable=False)
    evidence_refs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AgroIntelligenceFreshnessSignal(PlatformBase):
    __tablename__ = "agro_intelligence_freshness_signals"

    signal_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    entity_id: Mapped[str] = mapped_column(
        String(80),
        ForeignKey("agro_intelligence_entities.entity_id"),
        nullable=False,
    )
    freshness_status: Mapped[str] = mapped_column(String(16), nullable=False)
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stale_after_days: Mapped[int] = mapped_column(Integer, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    provenance: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
