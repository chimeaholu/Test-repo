"""fund opportunities and investments runtime"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0012")
    op.create_table(
        "funding_opportunities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("opportunity_id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("funding_goal", sa.Float(), nullable=False),
        sa.Column("current_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("expected_return_pct", sa.Float(), nullable=False),
        sa.Column("timeline_months", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("min_investment", sa.Float(), nullable=False),
        sa.Column("max_investment", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_funding_opportunities"),
        sa.UniqueConstraint("opportunity_id", name="uq_funding_opportunities_opportunity_id"),
    )
    op.create_index(
        "ix_funding_opportunities_country_status",
        "funding_opportunities",
        ["country_code", "status"],
        unique=False,
    )
    op.create_index(
        "ix_funding_opportunities_actor_country",
        "funding_opportunities",
        ["actor_id", "country_code"],
        unique=False,
    )

    op.create_table(
        "investments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("investment_id", sa.String(length=64), nullable=False),
        sa.Column("opportunity_id", sa.String(length=64), nullable=False),
        sa.Column("investor_actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("invested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expected_return_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_return_amount", sa.Float(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["funding_opportunities.opportunity_id"]),
        sa.PrimaryKeyConstraint("id", name="pk_investments"),
        sa.UniqueConstraint("investment_id", name="uq_investments_investment_id"),
    )
    op.create_index(
        "ix_investments_investor_country",
        "investments",
        ["investor_actor_id", "country_code"],
        unique=False,
    )
    op.create_index(
        "ix_investments_opportunity_id",
        "investments",
        ["opportunity_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_investments_opportunity_id", table_name="investments")
    op.drop_index("ix_investments_investor_country", table_name="investments")
    op.drop_table("investments")
    op.drop_index("ix_funding_opportunities_actor_country", table_name="funding_opportunities")
    op.drop_index("ix_funding_opportunities_country_status", table_name="funding_opportunities")
    op.drop_table("funding_opportunities")
