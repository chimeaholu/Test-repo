"""transport marketplace tables for R7"""

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
        "transport_loads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("load_id", sa.String(length=64), nullable=False),
        sa.Column("poster_actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("origin_location", sa.String(length=160), nullable=False),
        sa.Column("destination_location", sa.String(length=160), nullable=False),
        sa.Column("commodity", sa.String(length=64), nullable=False),
        sa.Column("weight_tons", sa.Float(), nullable=False),
        sa.Column("vehicle_type_required", sa.String(length=64), nullable=False),
        sa.Column("pickup_date", sa.Date(), nullable=False),
        sa.Column("delivery_deadline", sa.Date(), nullable=False),
        sa.Column("price_offer", sa.Float(), nullable=False),
        sa.Column("price_currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("assigned_transporter_actor_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_transport_loads"),
        sa.UniqueConstraint("load_id", name="uq_transport_loads_load_id"),
    )
    op.create_index(
        "ix_transport_loads_country_status",
        "transport_loads",
        ["country_code", "status"],
        unique=False,
    )
    op.create_index(
        "ix_transport_loads_poster_country",
        "transport_loads",
        ["poster_actor_id", "country_code"],
        unique=False,
    )

    op.create_table(
        "transport_shipments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("shipment_id", sa.String(length=64), nullable=False),
        sa.Column("load_id", sa.String(length=64), nullable=False),
        sa.Column("transporter_actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("vehicle_info", sa.JSON(), nullable=False),
        sa.Column("pickup_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_location_lat", sa.Float(), nullable=True),
        sa.Column("current_location_lng", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("proof_of_delivery_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["load_id"], ["transport_loads.load_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_transport_shipments"),
        sa.UniqueConstraint("shipment_id", name="uq_transport_shipments_shipment_id"),
    )
    op.create_index(
        "ix_transport_shipments_transporter_country",
        "transport_shipments",
        ["transporter_actor_id", "country_code"],
        unique=False,
    )
    op.create_index(
        "ix_transport_shipments_load_id",
        "transport_shipments",
        ["load_id"],
        unique=False,
    )

    op.create_table(
        "transport_shipment_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("shipment_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["transport_shipments.shipment_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_transport_shipment_events"),
        sa.UniqueConstraint("event_id", name="uq_transport_shipment_events_event_id"),
    )
    op.create_index(
        "ix_transport_shipment_events_shipment_id",
        "transport_shipment_events",
        ["shipment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transport_shipment_events_shipment_id", table_name="transport_shipment_events")
    op.drop_table("transport_shipment_events")
    op.drop_index("ix_transport_shipments_load_id", table_name="transport_shipments")
    op.drop_index("ix_transport_shipments_transporter_country", table_name="transport_shipments")
    op.drop_table("transport_shipments")
    op.drop_index("ix_transport_loads_poster_country", table_name="transport_loads")
    op.drop_index("ix_transport_loads_country_status", table_name="transport_loads")
    op.drop_table("transport_loads")
