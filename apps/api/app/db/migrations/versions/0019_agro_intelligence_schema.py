"""agro intelligence entity graph schema"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0019")

    op.create_table(
        "agro_intelligence_consent_artifacts",
        sa.Column("consent_artifact_id", sa.String(length=80), nullable=False),
        sa.Column("subject_ref", sa.String(length=120), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("scope_ids", sa.JSON(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("legal_basis", sa.String(length=80), nullable=False),
        sa.Column("boundary_ingest_id", sa.String(length=64), nullable=True),
        sa.Column("partner_slug", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status != 'revoked' OR revoked_at IS NOT NULL",
            name="revoked_requires_timestamp",
        ),
        sa.PrimaryKeyConstraint("consent_artifact_id", name="pk_agro_intelligence_consent_artifacts"),
    )

    op.create_table(
        "agro_intelligence_entities",
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("canonical_name", sa.String(length=160), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("trust_tier", sa.String(length=16), nullable=False),
        sa.Column("lifecycle_state", sa.String(length=32), nullable=False),
        sa.Column("source_tier", sa.String(length=1), nullable=False),
        sa.Column("confidence_score", sa.Integer(), nullable=False),
        sa.Column("boundary_subject_type", sa.String(length=32), nullable=True),
        sa.Column("latest_boundary_ingest_id", sa.String(length=64), nullable=True),
        sa.Column("latest_partner_slug", sa.String(length=80), nullable=True),
        sa.Column("latest_adapter_key", sa.String(length=80), nullable=True),
        sa.Column("consent_artifact_id", sa.String(length=80), nullable=True),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("attribute_payload", sa.JSON(), nullable=False),
        sa.Column("is_demo_entity", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "entity_type != 'person_actor' OR consent_artifact_id IS NOT NULL",
            name="person_actor_consent_artifact_required",
        ),
        sa.CheckConstraint(
            "confidence_score >= 0 AND confidence_score <= 100",
            name="confidence_score_range",
        ),
        sa.ForeignKeyConstraint(
            ["consent_artifact_id"],
            ["agro_intelligence_consent_artifacts.consent_artifact_id"],
        ),
        sa.PrimaryKeyConstraint("entity_id", name="pk_agro_intelligence_entities"),
    )
    op.create_index(
        "ix_agro_intelligence_entities_country_entity_type",
        "agro_intelligence_entities",
        ["country_code", "entity_type"],
        unique=False,
    )
    op.create_index(
        "ix_agro_intelligence_entities_trust_tier",
        "agro_intelligence_entities",
        ["trust_tier"],
        unique=False,
    )

    op.create_table(
        "agro_intelligence_source_documents",
        sa.Column("document_id", sa.String(length=80), nullable=False),
        sa.Column("source_id", sa.String(length=120), nullable=False),
        sa.Column("source_tier", sa.String(length=1), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("document_kind", sa.String(length=32), nullable=False),
        sa.Column("entity_refs", sa.JSON(), nullable=False),
        sa.Column("boundary_ingest_id", sa.String(length=64), nullable=True),
        sa.Column("partner_slug", sa.String(length=80), nullable=True),
        sa.Column("adapter_key", sa.String(length=80), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("legal_basis", sa.String(length=80), nullable=False),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("document_id", name="pk_agro_intelligence_source_documents"),
    )
    op.create_index(
        "ix_agro_intelligence_source_documents_source_id",
        "agro_intelligence_source_documents",
        ["source_id"],
        unique=False,
    )

    op.create_table(
        "agro_intelligence_relationships",
        sa.Column("relationship_id", sa.String(length=80), nullable=False),
        sa.Column("source_entity_id", sa.String(length=80), nullable=False),
        sa.Column("target_entity_id", sa.String(length=80), nullable=False),
        sa.Column("relationship_type", sa.String(length=32), nullable=False),
        sa.Column("trust_tier", sa.String(length=16), nullable=False),
        sa.Column("lifecycle_state", sa.String(length=32), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("attribute_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["source_entity_id"], ["agro_intelligence_entities.entity_id"]),
        sa.ForeignKeyConstraint(["target_entity_id"], ["agro_intelligence_entities.entity_id"]),
        sa.PrimaryKeyConstraint("relationship_id", name="pk_agro_intelligence_relationships"),
        sa.UniqueConstraint(
            "source_entity_id",
            "target_entity_id",
            "relationship_type",
            name="uq_agro_intelligence_relationships_edge",
        ),
    )
    op.create_index(
        "ix_agro_intelligence_relationships_source_entity_id",
        "agro_intelligence_relationships",
        ["source_entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_agro_intelligence_relationships_target_entity_id",
        "agro_intelligence_relationships",
        ["target_entity_id"],
        unique=False,
    )

    op.create_table(
        "agro_intelligence_verification_claims",
        sa.Column("claim_id", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("source_document_id", sa.String(length=80), nullable=True),
        sa.Column("claim_target", sa.String(length=160), nullable=False),
        sa.Column("claim_state", sa.String(length=32), nullable=False),
        sa.Column("verifier_type", sa.String(length=32), nullable=False),
        sa.Column("trust_tier", sa.String(length=16), nullable=False),
        sa.Column("evidence_refs", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["agro_intelligence_entities.entity_id"]),
        sa.ForeignKeyConstraint(
            ["source_document_id"],
            ["agro_intelligence_source_documents.document_id"],
        ),
        sa.PrimaryKeyConstraint("claim_id", name="pk_agro_intelligence_verification_claims"),
    )
    op.create_index(
        "ix_agro_intelligence_verification_claims_entity_id",
        "agro_intelligence_verification_claims",
        ["entity_id"],
        unique=False,
    )

    op.create_table(
        "agro_intelligence_freshness_signals",
        sa.Column("signal_id", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("freshness_status", sa.String(length=16), nullable=False),
        sa.Column("source_count", sa.Integer(), nullable=False),
        sa.Column("stale_after_days", sa.Integer(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["agro_intelligence_entities.entity_id"]),
        sa.PrimaryKeyConstraint("signal_id", name="pk_agro_intelligence_freshness_signals"),
    )
    op.create_index(
        "ix_agro_intelligence_freshness_signals_entity_id",
        "agro_intelligence_freshness_signals",
        ["entity_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_agro_intelligence_freshness_signals_entity_id", table_name="agro_intelligence_freshness_signals")
    op.drop_table("agro_intelligence_freshness_signals")
    op.drop_index(
        "ix_agro_intelligence_verification_claims_entity_id",
        table_name="agro_intelligence_verification_claims",
    )
    op.drop_table("agro_intelligence_verification_claims")
    op.drop_index(
        "ix_agro_intelligence_relationships_target_entity_id",
        table_name="agro_intelligence_relationships",
    )
    op.drop_index(
        "ix_agro_intelligence_relationships_source_entity_id",
        table_name="agro_intelligence_relationships",
    )
    op.drop_table("agro_intelligence_relationships")
    op.drop_index(
        "ix_agro_intelligence_source_documents_source_id",
        table_name="agro_intelligence_source_documents",
    )
    op.drop_table("agro_intelligence_source_documents")
    op.drop_index(
        "ix_agro_intelligence_entities_trust_tier",
        table_name="agro_intelligence_entities",
    )
    op.drop_index(
        "ix_agro_intelligence_entities_country_entity_type",
        table_name="agro_intelligence_entities",
    )
    op.drop_table("agro_intelligence_entities")
    op.drop_table("agro_intelligence_consent_artifacts")
