"""identity session and marketplace listings"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0005")
    op.create_table(
        "identity_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("session_token", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("organization_name", sa.String(length=120), nullable=False),
        sa.Column("consent_state", sa.String(length=32), nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=True),
        sa.Column("consent_scope_ids", sa.JSON(), nullable=False),
        sa.Column("consent_channel", sa.String(length=16), nullable=True),
        sa.Column("consent_captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_identity_sessions"),
        sa.UniqueConstraint("actor_id", name="uq_identity_sessions_actor_id"),
        sa.UniqueConstraint("session_token", name="uq_identity_sessions_session_token"),
    )
    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("commodity", sa.String(length=64), nullable=False),
        sa.Column("quantity_tons", sa.Float(), nullable=False),
        sa.Column("price_amount", sa.Float(), nullable=False),
        sa.Column("price_currency", sa.String(length=3), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_listings"),
        sa.UniqueConstraint("listing_id", name="uq_listings_listing_id"),
    )


def downgrade() -> None:
    op.drop_table("listings")
    op.drop_table("identity_sessions")
