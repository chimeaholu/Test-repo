"""advisory retrieval and reviewer runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0010")
    op.create_table(
        "advisory_source_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("body_markdown", sa.Text(), nullable=False),
        sa.Column("citation_url", sa.String(length=255), nullable=True),
        sa.Column("method_tag", sa.String(length=64), nullable=False),
        sa.Column("risk_tags", sa.JSON(), nullable=False),
        sa.Column("source_metadata", sa.JSON(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("vetted", sa.Boolean(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_advisory_source_documents"),
        sa.UniqueConstraint("source_id", name="uq_advisory_source_documents_source_id"),
    )
    op.create_index(
        "ix_advisory_source_documents_country_locale",
        "advisory_source_documents",
        ["country_code", "locale"],
        unique=False,
    )
    op.create_table(
        "advisory_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("advisory_request_id", sa.String(length=64), nullable=False),
        sa.Column("advisory_conversation_id", sa.String(length=64), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("topic", sa.String(length=120), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("confidence_band", sa.String(length=16), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("grounded", sa.Boolean(), nullable=False),
        sa.Column("source_ids", sa.JSON(), nullable=False),
        sa.Column("transcript_entries", sa.JSON(), nullable=False),
        sa.Column("policy_context", sa.JSON(), nullable=False),
        sa.Column("model_name", sa.String(length=80), nullable=False),
        sa.Column("model_version", sa.String(length=80), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_advisory_requests"),
        sa.UniqueConstraint("advisory_request_id", name="uq_advisory_requests_advisory_request_id"),
        sa.UniqueConstraint("request_id", name="uq_advisory_requests_request_id"),
    )
    op.create_index(
        "ix_advisory_requests_actor_country",
        "advisory_requests",
        ["actor_id", "country_code"],
        unique=False,
    )
    op.create_table(
        "reviewer_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("advisory_request_id", sa.String(length=64), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("transcript_link", sa.String(length=255), nullable=True),
        sa.Column("policy_context", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["advisory_request_id"],
            ["advisory_requests.advisory_request_id"],
            name="fk_reviewer_decisions_advisory_request_id_advisory_requests",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_reviewer_decisions"),
        sa.UniqueConstraint("decision_id", name="uq_reviewer_decisions_decision_id"),
    )
    op.create_index(
        "ix_reviewer_decisions_advisory_request_id",
        "reviewer_decisions",
        ["advisory_request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reviewer_decisions_advisory_request_id", table_name="reviewer_decisions")
    op.drop_table("reviewer_decisions")
    op.drop_index("ix_advisory_requests_actor_country", table_name="advisory_requests")
    op.drop_table("advisory_requests")
    op.drop_index(
        "ix_advisory_source_documents_country_locale",
        table_name="advisory_source_documents",
    )
    op.drop_table("advisory_source_documents")
