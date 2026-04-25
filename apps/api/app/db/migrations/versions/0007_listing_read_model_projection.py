"""listing read-model projection boundary"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0005"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0007")
    dialect_name = op.get_bind().dialect.name
    op.add_column("listings", sa.Column("revision_number", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("listings", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE listings SET revision_number = 1 WHERE revision_number IS NULL")
    if dialect_name != "sqlite":
        op.alter_column("listings", "revision_number", server_default=None)
    op.create_table(
        "listing_revisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.String(length=64), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(length=32), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("commodity", sa.String(length=64), nullable=False),
        sa.Column("quantity_tons", sa.Float(), nullable=False),
        sa.Column("price_amount", sa.Float(), nullable=False),
        sa.Column("price_currency", sa.String(length=3), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_listing_revisions"),
        sa.UniqueConstraint("listing_id", "revision_number", name="uq_listing_revisions_listing_id"),
    )
    op.add_column(
        "listings",
        sa.Column("published_revision_number", sa.Integer(), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column("revision_count", sa.Integer(), nullable=False, server_default="1"),
    )
    op.execute("UPDATE listings SET revision_count = revision_number")
    op.execute(
        """
        UPDATE listings
        SET published_revision_number = revision_number
        WHERE status = 'published'
        """
    )
    op.execute(
        """
        UPDATE listing_revisions
        SET change_type = CASE
            WHEN revision_number = 1 THEN 'created'
            WHEN status = 'published' THEN 'published'
            ELSE 'draft_updated'
        END
        """
    )
    if dialect_name != "sqlite":
        op.alter_column("listings", "revision_count", server_default=None)
        op.alter_column("listing_revisions", "change_type", server_default=None)


def downgrade() -> None:
    op.drop_column("listings", "revision_count")
    op.drop_column("listings", "published_revision_number")
    op.drop_table("listing_revisions")
    op.drop_column("listings", "published_at")
    op.drop_column("listings", "revision_number")
