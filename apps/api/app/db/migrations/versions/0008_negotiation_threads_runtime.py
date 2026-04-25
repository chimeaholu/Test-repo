"""negotiation thread runtime and checkpoint persistence"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0008")
    op.create_table(
        "negotiation_threads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.String(length=64), nullable=False),
        sa.Column("listing_id", sa.String(length=64), nullable=False),
        sa.Column("seller_actor_id", sa.String(length=64), nullable=False),
        sa.Column("buyer_actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("current_offer_amount", sa.Float(), nullable=False),
        sa.Column("current_offer_currency", sa.String(length=3), nullable=False),
        sa.Column("confirmation_requested_by_actor_id", sa.String(length=64), nullable=True),
        sa.Column("required_confirmer_actor_id", sa.String(length=64), nullable=True),
        sa.Column("confirmation_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_action_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_negotiation_threads"),
        sa.UniqueConstraint("thread_id", name="uq_negotiation_threads_thread_id"),
    )
    op.create_table(
        "negotiation_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("thread_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["negotiation_threads.thread_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_negotiation_messages"),
    )
    op.create_index(
        "ix_negotiation_threads_country_actor",
        "negotiation_threads",
        ["country_code", "seller_actor_id", "buyer_actor_id"],
        unique=False,
    )
    op.create_index(
        "ix_negotiation_messages_thread_id",
        "negotiation_messages",
        ["thread_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_negotiation_messages_thread_id", table_name="negotiation_messages")
    op.drop_index("ix_negotiation_threads_country_actor", table_name="negotiation_threads")
    op.drop_table("negotiation_messages")
    op.drop_table("negotiation_threads")
