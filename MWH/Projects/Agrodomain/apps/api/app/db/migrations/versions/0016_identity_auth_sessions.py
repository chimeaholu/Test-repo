"""identity accounts, challenges, and multi-session auth hardening"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None

LOGGER = logging.getLogger("agrodomain.api.migrations")


def upgrade() -> None:
    LOGGER.info("migration.upgrade revision=0016")

    op.create_table(
        "identity_accounts",
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=True),
        sa.Column("home_country_code", sa.String(length=2), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("password_recovery_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("actor_id", name="pk_identity_accounts"),
        sa.UniqueConstraint("email", name="uq_identity_accounts_email"),
        sa.UniqueConstraint("phone_number", name="uq_identity_accounts_phone_number"),
    )
    op.create_table(
        "identity_password_credentials",
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("actor_id", name="pk_identity_password_credentials"),
    )
    op.create_table(
        "identity_magic_link_challenges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("challenge_id", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("delivery_channel", sa.String(length=16), nullable=False),
        sa.Column("delivery_target", sa.String(length=255), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("requested_role", sa.String(length=32), nullable=True),
        sa.Column("verifier_hash", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_identity_magic_link_challenges"),
        sa.UniqueConstraint(
            "challenge_id",
            name="uq_identity_magic_link_challenges_challenge_id",
        ),
    )

    with op.batch_alter_table("identity_sessions") as batch_op:
        batch_op.add_column(sa.Column("session_id", sa.String(length=64), nullable=True))
        batch_op.add_column(
            sa.Column("issued_via", sa.String(length=32), nullable=False, server_default="legacy_session")
        )
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("refreshed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("revoke_reason", sa.String(length=64), nullable=True))
        batch_op.drop_constraint("uq_identity_sessions_actor_id", type_="unique")
        batch_op.create_unique_constraint("uq_identity_sessions_session_id", ["session_id"])

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO identity_accounts (
              actor_id,
              display_name,
              email,
              phone_number,
              home_country_code,
              locale,
              password_recovery_required,
              created_at,
              updated_at
            )
            SELECT
              actor_id,
              display_name,
              lower(email),
              NULL,
              country_code,
              locale,
              0,
              created_at,
              updated_at
            FROM identity_sessions
            GROUP BY actor_id, display_name, lower(email), country_code, locale, created_at, updated_at
            """
        )
    )
    bind.execute(
        sa.text(
            """
            INSERT INTO identity_accounts (
              actor_id,
              display_name,
              email,
              phone_number,
              home_country_code,
              locale,
              password_recovery_required
            )
            SELECT
              actor_id,
              replace(actor_id, ':', ' '),
              replace(replace(lower(actor_id), ':', '-'), ' ', '-') || '@internal.agrodomain.local',
              NULL,
              country_code,
              'en-' || country_code,
              0
            FROM identity_memberships
            WHERE actor_id NOT IN (SELECT actor_id FROM identity_accounts)
            GROUP BY actor_id, country_code
            """
        )
    )
    bind.execute(
        sa.text(
            """
            UPDATE identity_sessions
            SET
              session_id = 'session-' || id,
              expires_at = CURRENT_TIMESTAMP,
              last_seen_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP),
              revoked_at = CURRENT_TIMESTAMP,
              revoke_reason = 'legacy_bootstrap_replaced'
            """
        )
    )

    with op.batch_alter_table("identity_sessions") as batch_op:
        batch_op.alter_column("session_id", nullable=False)
        batch_op.alter_column("expires_at", nullable=False)
        batch_op.alter_column("last_seen_at", nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("identity_sessions") as batch_op:
        batch_op.drop_constraint("uq_identity_sessions_session_id", type_="unique")
        batch_op.create_unique_constraint("uq_identity_sessions_actor_id", ["actor_id"])
        batch_op.drop_column("revoke_reason")
        batch_op.drop_column("revoked_at")
        batch_op.drop_column("refreshed_at")
        batch_op.drop_column("last_seen_at")
        batch_op.drop_column("expires_at")
        batch_op.drop_column("issued_via")
        batch_op.drop_column("session_id")

    op.drop_table("identity_magic_link_challenges")
    op.drop_table("identity_password_credentials")
    op.drop_table("identity_accounts")
