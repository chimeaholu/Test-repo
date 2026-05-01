from datetime import datetime

from sqlalchemy import JSON, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import PlatformBase


class CountryPolicy(PlatformBase):
    __tablename__ = "country_policies"

    country_code: Mapped[str] = mapped_column(String(2), primary_key=True)
    locale: Mapped[str] = mapped_column(String(16), nullable=False)
    legal_basis: Mapped[str] = mapped_column(String(64), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IdentityMembership(PlatformBase):
    __tablename__ = "identity_memberships"
    __table_args__ = (
        UniqueConstraint("actor_id", "role", name="uq_identity_memberships_actor_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    provenance: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ConsentRecord(PlatformBase):
    __tablename__ = "consent_records"
    __table_args__ = (
        UniqueConstraint(
            "actor_id",
            "consent_type",
            "policy_version",
            name="uq_consent_records_actor_consent_policy",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    consent_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IdentitySessionRecord(PlatformBase):
    __tablename__ = "identity_sessions"
    __table_args__ = (
        UniqueConstraint("session_token", name="uq_identity_sessions_session_token"),
        UniqueConstraint("actor_id", name="uq_identity_sessions_actor_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    session_token: Mapped[str] = mapped_column(String(128), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    locale: Mapped[str] = mapped_column(String(16), nullable=False)
    organization_id: Mapped[str] = mapped_column(String(64), nullable=False)
    organization_name: Mapped[str] = mapped_column(String(120), nullable=False)
    consent_state: Mapped[str] = mapped_column(String(32), nullable=False, default="identified")
    policy_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    consent_scope_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    consent_channel: Mapped[str | None] = mapped_column(String(16), nullable=True)
    consent_captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
