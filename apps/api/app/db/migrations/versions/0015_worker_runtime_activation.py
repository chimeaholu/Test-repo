"""worker runtime activation"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0015_worker_runtime_activation"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "offline_replay_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.String(length=96), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("command_name", sa.String(length=128), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("disposition", sa.String(length=32), nullable=False),
        sa.Column("result_ref", sa.String(length=128), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("conflict_state", sa.String(length=32), nullable=False),
        sa.Column("conflict_ref", sa.String(length=128), nullable=True),
        sa.Column("replayed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_offline_replay_records"),
        sa.UniqueConstraint("idempotency_key", name="uq_offline_replay_records_idempotency_key"),
    )


def downgrade() -> None:
    op.drop_table("offline_replay_records")
