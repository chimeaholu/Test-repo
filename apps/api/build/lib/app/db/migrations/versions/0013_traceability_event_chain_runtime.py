"""traceability consignment and append-only event-chain runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0013")
    op.create_table(
        "consignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("consignment_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("current_custody_actor_id", sa.String(length=64), nullable=True),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_consignments"),
        sa.UniqueConstraint("consignment_id", name="uq_consignments_consignment_id"),
    )
    op.create_index(
        "ix_consignments_actor_country",
        "consignments",
        ["actor_id", "country_code"],
        unique=False,
    )

    op.create_table(
        "traceability_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("trace_event_id", sa.String(length=64), nullable=False),
        sa.Column("consignment_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("causation_id", sa.String(length=64), nullable=True),
        sa.Column("milestone", sa.String(length=32), nullable=False),
        sa.Column("event_reference", sa.String(length=128), nullable=False),
        sa.Column("previous_event_reference", sa.String(length=128), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["consignment_id"],
            ["consignments.consignment_id"],
            name="fk_traceability_events_consignment_id",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_traceability_events"),
        sa.UniqueConstraint("trace_event_id", name="uq_traceability_events_trace_event_id"),
        sa.UniqueConstraint("event_reference", name="uq_traceability_events_event_reference"),
        sa.UniqueConstraint(
            "consignment_id",
            "idempotency_key",
            name="uq_traceability_events_consignment_idempotency",
        ),
    )
    op.create_index(
        "ix_traceability_events_consignment_order",
        "traceability_events",
        ["consignment_id", "order_index"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_traceability_events_consignment_order", table_name="traceability_events")
    op.drop_table("traceability_events")
    op.drop_index("ix_consignments_actor_country", table_name="consignments")
    op.drop_table("consignments")
