"""platform baseline"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0001")
    op.create_table(
        "country_policies",
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("legal_basis", sa.String(length=64), nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("country_code", name="pk_country_policies"),
    )
    op.create_table(
        "identity_memberships",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_identity_memberships"),
        sa.UniqueConstraint("actor_id", "role", name="uq_identity_memberships_actor_role"),
    )


def downgrade() -> None:
    op.drop_table("identity_memberships")
    op.drop_table("country_policies")
