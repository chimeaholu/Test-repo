"""finance partner requests and insurance trigger runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0012")
    op.create_table(
        "finance_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("finance_request_id", sa.String(length=64), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("case_reference", sa.String(length=128), nullable=False),
        sa.Column("product_type", sa.String(length=64), nullable=False),
        sa.Column("requested_amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("partner_id", sa.String(length=64), nullable=False),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("responsibility_boundary", sa.JSON(), nullable=False),
        sa.Column("policy_context", sa.JSON(), nullable=False),
        sa.Column("transcript_entries", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_finance_requests"),
        sa.UniqueConstraint("finance_request_id", name="uq_finance_requests_finance_request_id"),
        sa.UniqueConstraint("request_id", name="uq_finance_requests_request_id"),
    )
    op.create_index(
        "ix_finance_requests_actor_status",
        "finance_requests",
        ["actor_id", "country_code", "status"],
        unique=False,
    )
    op.create_table(
        "finance_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("decision_id", sa.String(length=64), nullable=False),
        sa.Column("finance_request_id", sa.String(length=64), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("decision_source", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("responsibility_boundary", sa.JSON(), nullable=False),
        sa.Column("policy_context", sa.JSON(), nullable=False),
        sa.Column("transcript_link", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["finance_request_id"],
            ["finance_requests.finance_request_id"],
            name="fk_finance_decisions_finance_request_id_finance_requests",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_finance_decisions"),
        sa.UniqueConstraint("decision_id", name="uq_finance_decisions_decision_id"),
    )
    op.create_index(
        "ix_finance_decisions_request_created",
        "finance_decisions",
        ["finance_request_id", "created_at"],
        unique=False,
    )
    op.create_table(
        "insurance_triggers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("trigger_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("partner_id", sa.String(length=64), nullable=False),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("product_code", sa.String(length=64), nullable=False),
        sa.Column("climate_signal", sa.String(length=32), nullable=False),
        sa.Column("comparator", sa.String(length=8), nullable=False),
        sa.Column("threshold_value", sa.Float(), nullable=False),
        sa.Column("threshold_unit", sa.String(length=32), nullable=False),
        sa.Column("evaluation_window_hours", sa.Integer(), nullable=False),
        sa.Column("threshold_source_id", sa.String(length=128), nullable=False),
        sa.Column("threshold_source_type", sa.String(length=64), nullable=False),
        sa.Column("threshold_source_reference", sa.JSON(), nullable=False),
        sa.Column("payout_amount", sa.Float(), nullable=False),
        sa.Column("payout_currency", sa.String(length=3), nullable=False),
        sa.Column("policy_context", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_insurance_triggers"),
        sa.UniqueConstraint("trigger_id", name="uq_insurance_triggers_trigger_id"),
    )
    op.create_index(
        "ix_insurance_triggers_partner_country",
        "insurance_triggers",
        ["partner_id", "country_code"],
        unique=False,
    )
    op.create_table(
        "insurance_evaluations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("evaluation_id", sa.String(length=64), nullable=False),
        sa.Column("trigger_id", sa.String(length=64), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("source_event_id", sa.String(length=128), nullable=False),
        sa.Column("source_observation_id", sa.String(length=128), nullable=True),
        sa.Column("observed_value", sa.Float(), nullable=False),
        sa.Column("threshold_value", sa.Float(), nullable=False),
        sa.Column("evaluation_state", sa.String(length=32), nullable=False),
        sa.Column("triggered", sa.Boolean(), nullable=False),
        sa.Column("payout_dedupe_key", sa.String(length=160), nullable=False),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("climate_source_reference", sa.JSON(), nullable=False),
        sa.Column("payout_event_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["trigger_id"],
            ["insurance_triggers.trigger_id"],
            name="fk_insurance_evaluations_trigger_id_insurance_triggers",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_insurance_evaluations"),
        sa.UniqueConstraint("evaluation_id", name="uq_insurance_evaluations_evaluation_id"),
    )
    op.create_index(
        "ix_insurance_evaluations_trigger_event",
        "insurance_evaluations",
        ["trigger_id", "source_event_id"],
        unique=False,
    )
    op.create_table(
        "insurance_payout_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payout_event_id", sa.String(length=64), nullable=False),
        sa.Column("trigger_id", sa.String(length=64), nullable=False),
        sa.Column("evaluation_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("partner_id", sa.String(length=64), nullable=False),
        sa.Column("partner_reference_id", sa.String(length=128), nullable=True),
        sa.Column("payout_dedupe_key", sa.String(length=160), nullable=False),
        sa.Column("payout_amount", sa.Float(), nullable=False),
        sa.Column("payout_currency", sa.String(length=3), nullable=False),
        sa.Column("climate_source_reference", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_insurance_payout_events"),
        sa.UniqueConstraint("payout_event_id", name="uq_insurance_payout_events_payout_event_id"),
        sa.UniqueConstraint("payout_dedupe_key", name="uq_insurance_payout_events_payout_dedupe_key"),
    )
    op.create_index(
        "ix_insurance_payout_events_trigger_created",
        "insurance_payout_events",
        ["trigger_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_insurance_payout_events_trigger_created", table_name="insurance_payout_events")
    op.drop_table("insurance_payout_events")
    op.drop_index("ix_insurance_evaluations_trigger_event", table_name="insurance_evaluations")
    op.drop_table("insurance_evaluations")
    op.drop_index("ix_insurance_triggers_partner_country", table_name="insurance_triggers")
    op.drop_table("insurance_triggers")
    op.drop_index("ix_finance_decisions_request_created", table_name="finance_decisions")
    op.drop_table("finance_decisions")
    op.drop_index("ix_finance_requests_actor_status", table_name="finance_requests")
    op.drop_table("finance_requests")
