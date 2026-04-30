"""provider-backed payment collection records for EH5"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0017")
    op.create_table(
        "payment_collection_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payment_id", sa.String(length=64), nullable=False),
        sa.Column("escrow_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_mode", sa.String(length=16), nullable=False),
        sa.Column("provider_reference", sa.String(length=80), nullable=False),
        sa.Column("provider_access_code", sa.String(length=128), nullable=True),
        sa.Column("authorization_url", sa.String(length=500), nullable=True),
        sa.Column("local_status", sa.String(length=32), nullable=False),
        sa.Column("provider_status", sa.String(length=32), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=128), nullable=True),
        sa.Column("channels", sa.JSON(), nullable=False),
        sa.Column("provider_payload", sa.JSON(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("last_error_code", sa.String(length=64), nullable=True),
        sa.Column("last_error_detail", sa.String(length=300), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("wallet_entry_id", sa.String(length=64), nullable=True),
        sa.Column("wallet_funding_applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escrow_funded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_payment_collection_records"),
        sa.UniqueConstraint("payment_id", name="uq_payment_collection_records_payment_id"),
        sa.UniqueConstraint(
            "provider",
            "provider_reference",
            name="uq_payment_collection_records_provider_reference",
        ),
    )
    op.create_index(
        "ix_payment_collection_records_escrow_actor",
        "payment_collection_records",
        ["escrow_id", "actor_id"],
        unique=False,
    )
    op.create_index(
        "ix_payment_collection_records_actor_country",
        "payment_collection_records",
        ["actor_id", "country_code"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_payment_collection_records_actor_country", table_name="payment_collection_records")
    op.drop_index("ix_payment_collection_records_escrow_actor", table_name="payment_collection_records")
    op.drop_table("payment_collection_records")
