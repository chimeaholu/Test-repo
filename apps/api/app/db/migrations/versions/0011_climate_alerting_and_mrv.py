"""climate ingestion, alerts, and mrv evidence runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0011")
    op.create_table(
        "farm_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("farm_name", sa.String(length=120), nullable=False),
        sa.Column("district", sa.String(length=120), nullable=False),
        sa.Column("crop_type", sa.String(length=64), nullable=False),
        sa.Column("hectares", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_farm_profiles"),
        sa.UniqueConstraint("farm_id", name="uq_farm_profiles_farm_id"),
    )
    op.create_index(
        "ix_farm_profiles_actor_country",
        "farm_profiles",
        ["actor_id", "country_code"],
        unique=False,
    )
    op.create_table(
        "climate_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("observation_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("source_id", sa.String(length=128), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rainfall_mm", sa.Float(), nullable=True),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("soil_moisture_pct", sa.Float(), nullable=True),
        sa.Column("anomaly_score", sa.Float(), nullable=True),
        sa.Column("ingestion_state", sa.String(length=32), nullable=False),
        sa.Column("degraded_mode", sa.Boolean(), nullable=False),
        sa.Column("degraded_reason_codes", sa.JSON(), nullable=False),
        sa.Column("assumptions", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("normalized_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_climate_observations"),
        sa.UniqueConstraint("observation_id", name="uq_climate_observations_observation_id"),
    )
    op.create_index(
        "ix_climate_observations_farm_window",
        "climate_observations",
        ["farm_id", "source_window_start", "source_window_end"],
        unique=False,
    )
    op.create_table(
        "climate_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("alert_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("observation_id", sa.String(length=64), nullable=True),
        sa.Column("alert_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("precedence_rank", sa.Integer(), nullable=False),
        sa.Column("headline", sa.String(length=160), nullable=False),
        sa.Column("detail", sa.String(length=600), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("source_confidence", sa.String(length=24), nullable=False),
        sa.Column("degraded_mode", sa.Boolean(), nullable=False),
        sa.Column("degraded_reason_codes", sa.JSON(), nullable=False),
        sa.Column("farm_context", sa.JSON(), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_by_actor_id", sa.String(length=64), nullable=True),
        sa.Column("acknowledgement_note", sa.String(length=300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_climate_alerts"),
        sa.UniqueConstraint("alert_id", name="uq_climate_alerts_alert_id"),
    )
    op.create_index(
        "ix_climate_alerts_actor_status",
        "climate_alerts",
        ["actor_id", "country_code", "status"],
        unique=False,
    )
    op.create_table(
        "mrv_evidence_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("evidence_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("evidence_type", sa.String(length=64), nullable=False),
        sa.Column("method_tag", sa.String(length=64), nullable=False),
        sa.Column("method_references", sa.JSON(), nullable=False),
        sa.Column("source_window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_observation_ids", sa.JSON(), nullable=False),
        sa.Column("alert_ids", sa.JSON(), nullable=False),
        sa.Column("assumptions", sa.JSON(), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("source_completeness_state", sa.String(length=32), nullable=False),
        sa.Column("degraded_mode", sa.Boolean(), nullable=False),
        sa.Column("degraded_reason_codes", sa.JSON(), nullable=False),
        sa.Column("summary", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_mrv_evidence_records"),
        sa.UniqueConstraint("evidence_id", name="uq_mrv_evidence_records_evidence_id"),
    )
    op.create_index(
        "ix_mrv_evidence_records_actor_farm",
        "mrv_evidence_records",
        ["actor_id", "country_code", "farm_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_mrv_evidence_records_actor_farm", table_name="mrv_evidence_records")
    op.drop_table("mrv_evidence_records")
    op.drop_index("ix_climate_alerts_actor_status", table_name="climate_alerts")
    op.drop_table("climate_alerts")
    op.drop_index("ix_climate_observations_farm_window", table_name="climate_observations")
    op.drop_table("climate_observations")
    op.drop_index("ix_farm_profiles_actor_country", table_name="farm_profiles")
    op.drop_table("farm_profiles")
