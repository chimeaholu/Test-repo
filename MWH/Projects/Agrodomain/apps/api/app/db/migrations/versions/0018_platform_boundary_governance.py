"""platform boundary deliveries and inbound governance records"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0018")

    op.create_table(
        "partner_boundary_deliveries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("delivery_id", sa.String(length=64), nullable=False),
        sa.Column("partner_slug", sa.String(length=80), nullable=False),
        sa.Column("event_family", sa.String(length=120), nullable=False),
        sa.Column("aggregate_id", sa.String(length=80), nullable=False),
        sa.Column("delivery_mode", sa.String(length=24), nullable=False),
        sa.Column("delivery_target", sa.String(length=240), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("audit_event_id", sa.Integer(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_partner_boundary_deliveries"),
        sa.UniqueConstraint("delivery_id", name="uq_partner_boundary_deliveries_delivery_id"),
    )

    op.create_table(
        "partner_inbound_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ingest_id", sa.String(length=64), nullable=False),
        sa.Column("partner_slug", sa.String(length=80), nullable=False),
        sa.Column("partner_record_id", sa.String(length=120), nullable=False),
        sa.Column("adapter_key", sa.String(length=80), nullable=False),
        sa.Column("data_product", sa.String(length=120), nullable=False),
        sa.Column("subject_type", sa.String(length=32), nullable=False),
        sa.Column("subject_ref", sa.String(length=120), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("scope_ids", sa.JSON(), nullable=False),
        sa.Column("contains_personal_data", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("consent_artifact", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=True),
        sa.Column("audit_event_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_partner_inbound_records"),
        sa.UniqueConstraint("ingest_id", name="uq_partner_inbound_records_ingest_id"),
    )


def downgrade() -> None:
    op.drop_table("partner_inbound_records")
    op.drop_table("partner_boundary_deliveries")
