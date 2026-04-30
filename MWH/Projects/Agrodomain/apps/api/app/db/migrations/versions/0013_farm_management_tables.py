"""farm management tables for R6"""

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
        "farm_fields",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("field_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("boundary_geojson", sa.JSON(), nullable=True),
        sa.Column("area_hectares", sa.Float(), nullable=False),
        sa.Column("soil_type", sa.String(length=64), nullable=True),
        sa.Column("irrigation_type", sa.String(length=64), nullable=True),
        sa.Column("current_crop", sa.String(length=64), nullable=True),
        sa.Column("planting_date", sa.Date(), nullable=True),
        sa.Column("expected_harvest_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farm_profiles.farm_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_farm_fields"),
        sa.UniqueConstraint("field_id", name="uq_farm_fields_field_id"),
    )
    op.create_index("ix_farm_fields_farm_id", "farm_fields", ["farm_id"], unique=False)
    op.create_index(
        "ix_farm_fields_actor_country",
        "farm_fields",
        ["actor_id", "country_code"],
        unique=False,
    )

    op.create_table(
        "farm_activities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("activity_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("field_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("activity_type", sa.String(length=32), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=False),
        sa.Column("inputs_used", sa.JSON(), nullable=False),
        sa.Column("labor_hours", sa.Float(), nullable=True),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(length=600), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farm_profiles.farm_id"]),
        sa.ForeignKeyConstraint(["field_id"], ["farm_fields.field_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_farm_activities"),
        sa.UniqueConstraint("activity_id", name="uq_farm_activities_activity_id"),
    )
    op.create_index("ix_farm_activities_farm_id", "farm_activities", ["farm_id"], unique=False)
    op.create_index("ix_farm_activities_field_id", "farm_activities", ["field_id"], unique=False)

    op.create_table(
        "farm_inputs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("input_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("input_type", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=24), nullable=False),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("supplier", sa.String(length=160), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farm_profiles.farm_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_farm_inputs"),
        sa.UniqueConstraint("input_id", name="uq_farm_inputs_input_id"),
    )
    op.create_index("ix_farm_inputs_farm_id", "farm_inputs", ["farm_id"], unique=False)
    op.create_index(
        "ix_farm_inputs_actor_country",
        "farm_inputs",
        ["actor_id", "country_code"],
        unique=False,
    )

    op.create_table(
        "crop_cycles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("crop_cycle_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("field_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("crop_type", sa.String(length=64), nullable=False),
        sa.Column("variety", sa.String(length=120), nullable=True),
        sa.Column("planting_date", sa.Date(), nullable=False),
        sa.Column("harvest_date", sa.Date(), nullable=True),
        sa.Column("yield_tons", sa.Float(), nullable=True),
        sa.Column("revenue", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farm_profiles.farm_id"]),
        sa.ForeignKeyConstraint(["field_id"], ["farm_fields.field_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_crop_cycles"),
        sa.UniqueConstraint("crop_cycle_id", name="uq_crop_cycles_crop_cycle_id"),
    )
    op.create_index("ix_crop_cycles_farm_id", "crop_cycles", ["farm_id"], unique=False)
    op.create_index("ix_crop_cycles_field_id", "crop_cycles", ["field_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_crop_cycles_field_id", table_name="crop_cycles")
    op.drop_index("ix_crop_cycles_farm_id", table_name="crop_cycles")
    op.drop_table("crop_cycles")
    op.drop_index("ix_farm_inputs_actor_country", table_name="farm_inputs")
    op.drop_index("ix_farm_inputs_farm_id", table_name="farm_inputs")
    op.drop_table("farm_inputs")
    op.drop_index("ix_farm_activities_field_id", table_name="farm_activities")
    op.drop_index("ix_farm_activities_farm_id", table_name="farm_activities")
    op.drop_table("farm_activities")
    op.drop_index("ix_farm_fields_actor_country", table_name="farm_fields")
    op.drop_index("ix_farm_fields_farm_id", table_name="farm_fields")
    op.drop_table("farm_fields")
