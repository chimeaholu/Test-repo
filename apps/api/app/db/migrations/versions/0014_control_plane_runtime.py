"""control plane runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0014")
    op.create_table(
        "telemetry_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("observation_id", sa.String(length=96), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("service_name", sa.String(length=64), nullable=False),
        sa.Column("slo_id", sa.String(length=32), nullable=True),
        sa.Column("alert_severity", sa.String(length=16), nullable=True),
        sa.Column("audit_event_id", sa.Integer(), nullable=False),
        sa.Column("source_kind", sa.String(length=32), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("success_count", sa.Integer(), nullable=False),
        sa.Column("error_count", sa.Integer(), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
        sa.Column("latency_p95_ms", sa.Float(), nullable=False),
        sa.Column("stale_after_seconds", sa.Integer(), nullable=False),
        sa.Column("release_blocking", sa.Boolean(), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("schema_version", sa.String(length=32), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_telemetry_observations"),
        sa.UniqueConstraint("idempotency_key", name="uq_telemetry_observations_idempotency_key"),
        sa.UniqueConstraint("observation_id", name="uq_telemetry_observations_observation_id"),
    )
    op.create_index(
        "ix_telemetry_observations_country_service",
        "telemetry_observations",
        ["country_code", "service_name", "window_ended_at"],
        unique=False,
    )

    op.create_table(
        "rollout_state_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("service_name", sa.String(length=64), nullable=False),
        sa.Column("slo_id", sa.String(length=32), nullable=True),
        sa.Column("alert_severity", sa.String(length=16), nullable=True),
        sa.Column("audit_event_id", sa.Integer(), nullable=False),
        sa.Column("scope_key", sa.String(length=96), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("previous_state", sa.String(length=32), nullable=True),
        sa.Column("intent", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=False),
        sa.Column("reason_detail", sa.String(length=280), nullable=False),
        sa.Column("limited_release_percent", sa.Integer(), nullable=True),
        sa.Column("schema_version", sa.String(length=32), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_rollout_state_records"),
        sa.UniqueConstraint("idempotency_key", name="uq_rollout_state_records_idempotency_key"),
    )
    op.create_index(
        "ix_rollout_state_records_country_service_scope",
        "rollout_state_records",
        ["country_code", "service_name", "scope_key", "changed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_rollout_state_records_country_service_scope", table_name="rollout_state_records")
    op.drop_table("rollout_state_records")
    op.drop_index("ix_telemetry_observations_country_service", table_name="telemetry_observations")
    op.drop_table("telemetry_observations")
