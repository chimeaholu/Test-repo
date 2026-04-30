"""wallet ledger and escrow runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0009")
    op.create_table(
        "wallet_accounts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("wallet_id", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_wallet_accounts"),
        sa.UniqueConstraint("wallet_id", name="uq_wallet_accounts_wallet_id"),
        sa.UniqueConstraint(
            "actor_id",
            "country_code",
            "currency",
            name="uq_wallet_accounts_actor_country_currency",
        ),
    )
    op.create_table(
        "wallet_ledger_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("entry_id", sa.String(length=64), nullable=False),
        sa.Column("wallet_id", sa.String(length=128), nullable=False),
        sa.Column("wallet_actor_id", sa.String(length=64), nullable=False),
        sa.Column("counterparty_actor_id", sa.String(length=64), nullable=True),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("available_delta", sa.Float(), nullable=False),
        sa.Column("held_delta", sa.Float(), nullable=False),
        sa.Column("resulting_available_balance", sa.Float(), nullable=False),
        sa.Column("resulting_held_balance", sa.Float(), nullable=False),
        sa.Column("balance_version", sa.Integer(), nullable=False),
        sa.Column("entry_sequence", sa.Integer(), nullable=False),
        sa.Column("escrow_id", sa.String(length=64), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("reconciliation_marker", sa.String(length=128), nullable=True),
        sa.Column("entry_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["wallet_id"], ["wallet_accounts.wallet_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_wallet_ledger_entries"),
        sa.UniqueConstraint("entry_id", name="uq_wallet_ledger_entries_entry_id"),
        sa.UniqueConstraint(
            "wallet_id",
            "entry_sequence",
            name="uq_wallet_ledger_entries_wallet_id_entry_sequence",
        ),
    )
    op.create_index(
        "ix_wallet_ledger_entries_wallet_actor",
        "wallet_ledger_entries",
        ["wallet_actor_id", "country_code", "currency"],
        unique=False,
    )
    op.create_table(
        "escrow_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("escrow_id", sa.String(length=64), nullable=False),
        sa.Column("thread_id", sa.String(length=64), nullable=False),
        sa.Column("listing_id", sa.String(length=64), nullable=False),
        sa.Column("buyer_actor_id", sa.String(length=64), nullable=False),
        sa.Column("seller_actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("partner_reference", sa.String(length=128), nullable=True),
        sa.Column("partner_reason_code", sa.String(length=64), nullable=True),
        sa.Column("initiated_by_actor_id", sa.String(length=64), nullable=False),
        sa.Column("funded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disputed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_escrow_records"),
        sa.UniqueConstraint("escrow_id", name="uq_escrow_records_escrow_id"),
        sa.UniqueConstraint("thread_id", name="uq_escrow_records_thread_id"),
    )
    op.create_index(
        "ix_escrow_records_country_actors",
        "escrow_records",
        ["country_code", "buyer_actor_id", "seller_actor_id"],
        unique=False,
    )
    op.create_table(
        "escrow_timeline_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("escrow_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("transition", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("notification_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["escrow_id"], ["escrow_records.escrow_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_escrow_timeline_entries"),
    )
    op.create_index(
        "ix_escrow_timeline_entries_escrow_id",
        "escrow_timeline_entries",
        ["escrow_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_escrow_timeline_entries_escrow_id", table_name="escrow_timeline_entries")
    op.drop_table("escrow_timeline_entries")
    op.drop_index("ix_escrow_records_country_actors", table_name="escrow_records")
    op.drop_table("escrow_records")
    op.drop_index("ix_wallet_ledger_entries_wallet_actor", table_name="wallet_ledger_entries")
    op.drop_table("wallet_ledger_entries")
    op.drop_table("wallet_accounts")
