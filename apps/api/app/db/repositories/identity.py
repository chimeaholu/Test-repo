from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from re import sub
from secrets import token_hex
from typing import Protocol

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.demo import demo_persona_definition, is_demo_actor_id, workspace_payload_for_session_record
from app.core.identity_security import ensure_utc, hash_access_token, utcnow
from app.db.models.platform import (
    ConsentRecord,
    IdentityAccount,
    IdentityMagicLinkChallenge,
    IdentityMembership,
    IdentityPasswordCredential,
    IdentitySessionRecord,
)


def _organization_name(country_code: str) -> str:
    return {
        "GH": "Ghana Growers Network",
        "NG": "Nigeria Produce Exchange",
        "JM": "Jamaica Crop Alliance",
    }.get(country_code, f"{country_code} Growers Network")


def _organization_id(country_code: str) -> str:
    return f"org-{country_code.lower()}-01"


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _actor_slug(display_name: str, email: str) -> str:
    candidate = display_name.strip().lower() or email.split("@", 1)[0].lower()
    normalized = sub(r"[^a-z0-9]+", "-", candidate).strip("-") or "user"
    return normalized[:24]


def _organization_fields(actor_id: str, country_code: str) -> tuple[str, str]:
    if is_demo_actor_id(actor_id):
        persona = demo_persona_definition(actor_id)
        if persona is not None:
            return str(persona["organization_id"]), str(persona["organization_name"])
    return _organization_id(country_code), _organization_name(country_code)


@dataclass(frozen=True)
class ActorSearchMatch:
    actor_id: str
    display_name: str
    email: str
    role: str
    country_code: str
    organization_name: str


class SessionPayloadRecord(Protocol):
    actor_id: str
    display_name: str
    email: str
    role: str
    country_code: str
    locale: str
    organization_id: str
    organization_name: str
    consent_state: str
    policy_version: str | None
    consent_scope_ids: list[str]
    consent_channel: str | None
    consent_captured_at: datetime | None
    consent_revoked_at: datetime | None


@dataclass
class IssuedSessionRecord:
    session_id: str
    session_token: str
    actor_id: str
    display_name: str
    email: str
    role: str
    country_code: str
    locale: str
    organization_id: str
    organization_name: str
    consent_state: str
    policy_version: str | None
    consent_scope_ids: list[str]
    consent_channel: str | None
    consent_captured_at: datetime | None
    consent_revoked_at: datetime | None


class IdentityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def ensure_membership(self, *, actor_id: str, role: str, country_code: str) -> IdentityMembership:
        statement = select(IdentityMembership).where(
            IdentityMembership.actor_id == actor_id,
            IdentityMembership.role == role,
            IdentityMembership.country_code == country_code,
        )
        record = self.session.execute(statement).scalar_one_or_none()
        if record is None:
            record = IdentityMembership(
                actor_id=actor_id,
                role=role,
                country_code=country_code,
                provenance={"seeded": False, "source": "identity.account.membership"},
            )
            self.session.add(record)
            self.session.flush()
            return record

        record.provenance = {"seeded": False, "source": "identity.account.membership"}
        self.session.flush()
        return record

    def create_account(
        self,
        *,
        display_name: str,
        email: str,
        phone_number: str | None,
        country_code: str,
    ) -> IdentityAccount:
        normalized_email = _normalize_email(email)
        if self.get_account_by_email(normalized_email) is not None:
            raise ValueError("identity_account_exists")
        if phone_number and self.get_account_by_phone(phone_number) is not None:
            raise ValueError("identity_phone_already_in_use")

        actor_id = f"actor-{_actor_slug(display_name, normalized_email)}-{token_hex(3)}"
        account = IdentityAccount(
            actor_id=actor_id,
            display_name=display_name.strip(),
            email=normalized_email,
            phone_number=phone_number,
            home_country_code=country_code,
            locale=f"en-{country_code}",
            password_recovery_required=False,
        )
        self.session.add(account)
        self.session.flush()
        return account

    def get_account_by_email(self, email: str) -> IdentityAccount | None:
        statement = select(IdentityAccount).where(IdentityAccount.email == _normalize_email(email))
        return self.session.execute(statement).scalar_one_or_none()

    def get_account_by_phone(self, phone_number: str) -> IdentityAccount | None:
        statement = select(IdentityAccount).where(IdentityAccount.phone_number == phone_number)
        return self.session.execute(statement).scalar_one_or_none()

    def get_account_by_actor(self, actor_id: str) -> IdentityAccount | None:
        return self.session.get(IdentityAccount, actor_id)

    def resolve_account(self, identifier: str) -> IdentityAccount | None:
        return (
            self.get_account_by_email(identifier)
            if "@" in identifier
            else self.get_account_by_phone(identifier)
        )

    def get_password_credential(self, actor_id: str) -> IdentityPasswordCredential | None:
        return self.session.get(IdentityPasswordCredential, actor_id)

    def set_password_credential(self, *, actor_id: str, password_hash: str) -> IdentityPasswordCredential:
        credential = self.get_password_credential(actor_id)
        now = utcnow()
        if credential is None:
            credential = IdentityPasswordCredential(
                actor_id=actor_id,
                password_hash=password_hash,
                failed_attempts=0,
                locked_until=None,
                password_updated_at=now,
            )
            self.session.add(credential)
            self.session.flush()
            return credential

        credential.password_hash = password_hash
        credential.failed_attempts = 0
        credential.locked_until = None
        credential.password_updated_at = now
        self.session.flush()
        return credential

    def register_failed_password_attempt(self, actor_id: str) -> None:
        credential = self.get_password_credential(actor_id)
        if credential is None:
            return
        credential.failed_attempts += 1
        if credential.failed_attempts >= 5:
            credential.locked_until = utcnow() + timedelta(minutes=15)
        self.session.flush()

    def clear_failed_password_attempts(self, actor_id: str) -> None:
        credential = self.get_password_credential(actor_id)
        if credential is None:
            return
        credential.failed_attempts = 0
        credential.locked_until = None
        self.session.flush()

    def create_magic_link_challenge(
        self,
        *,
        actor_id: str,
        purpose: str,
        delivery_channel: str,
        delivery_target: str,
        country_code: str,
        requested_role: str | None,
        verifier_hash: str,
        provider: str,
        expires_at,
    ) -> IdentityMagicLinkChallenge:
        challenge = IdentityMagicLinkChallenge(
            challenge_id=f"challenge-{token_hex(10)}",
            actor_id=actor_id,
            purpose=purpose,
            delivery_channel=delivery_channel,
            delivery_target=delivery_target,
            country_code=country_code,
            requested_role=requested_role,
            verifier_hash=verifier_hash,
            provider=provider,
            expires_at=expires_at,
            consumed_at=None,
        )
        self.session.add(challenge)
        self.session.flush()
        return challenge

    def get_magic_link_challenge(self, challenge_id: str, *, purpose: str) -> IdentityMagicLinkChallenge | None:
        statement = select(IdentityMagicLinkChallenge).where(
            IdentityMagicLinkChallenge.challenge_id == challenge_id,
            IdentityMagicLinkChallenge.purpose == purpose,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def mark_challenge_consumed(self, challenge: IdentityMagicLinkChallenge) -> None:
        challenge.consumed_at = utcnow()
        self.session.flush()

    def list_memberships(self, *, actor_id: str, country_code: str | None = None) -> list[IdentityMembership]:
        statement = select(IdentityMembership).where(IdentityMembership.actor_id == actor_id)
        if country_code is not None:
            statement = statement.where(IdentityMembership.country_code == country_code)
        statement = statement.order_by(IdentityMembership.role.asc(), IdentityMembership.id.asc())
        return list(self.session.execute(statement).scalars().all())

    def actor_has_membership(self, *, actor_id: str, role: str, country_code: str) -> bool:
        statement = select(IdentityMembership.id).where(
            IdentityMembership.actor_id == actor_id,
            IdentityMembership.role == role,
            IdentityMembership.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none() is not None

    def get_session_by_token_hash(self, token_hash: str) -> IdentitySessionRecord | None:
        statement = select(IdentitySessionRecord).where(IdentitySessionRecord.session_token == token_hash)
        return self.session.execute(statement).scalar_one_or_none()

    def get_session_by_token(self, token: str) -> IdentitySessionRecord | None:
        return self.get_session_by_token_hash(hash_access_token(token))

    def get_session_by_session_id(self, session_id: str) -> IdentitySessionRecord | None:
        statement = select(IdentitySessionRecord).where(IdentitySessionRecord.session_id == session_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_session_by_actor(self, actor_id: str) -> IdentitySessionRecord | None:
        statement = (
            select(IdentitySessionRecord)
            .where(IdentitySessionRecord.actor_id == actor_id)
            .order_by(IdentitySessionRecord.updated_at.desc(), IdentitySessionRecord.id.desc())
        )
        return self.session.execute(statement).scalars().first()

    def issue_session(
        self,
        *,
        settings: Settings,
        actor_id: str,
        role: str,
        country_code: str,
        issued_via: str,
    ) -> tuple[str, IdentitySessionRecord]:
        account = self.get_account_by_actor(actor_id)
        if account is None:
            raise ValueError("identity_account_not_found")
        if not self.actor_has_membership(actor_id=actor_id, role=role, country_code=country_code):
            raise ValueError("role_membership_missing")

        now = utcnow()
        raw_token = token_hex(32)
        consent = self._latest_consent(actor_id)
        organization_id, organization_name = _organization_fields(actor_id, country_code)
        record = IdentitySessionRecord(
            session_id=f"session-{token_hex(10)}",
            actor_id=actor_id,
            session_token=hash_access_token(raw_token),
            display_name=account.display_name,
            email=account.email,
            role=role,
            country_code=country_code,
            locale=f"en-{country_code}",
            organization_id=organization_id,
            organization_name=organization_name,
            consent_state="consent_granted" if consent and consent.status == "granted" else "identified",
            policy_version=consent.policy_version if consent and consent.status == "granted" else None,
            consent_scope_ids=["identity.core", "workflow.audit"] if consent and consent.status == "granted" else [],
            consent_channel="pwa" if consent and consent.status == "granted" else None,
            consent_captured_at=now if consent and consent.status == "granted" else None,
            consent_revoked_at=None,
            issued_via=issued_via,
            expires_at=now + timedelta(minutes=settings.auth_session_ttl_minutes),
            last_seen_at=now,
            refreshed_at=None,
            revoked_at=None,
            revoke_reason=None,
        )
        account.last_login_at = now
        self.session.add(record)
        self.session.flush()
        return raw_token, record

    def create_or_rotate_session(
        self,
        *,
        actor_id: str,
        display_name: str,
        email: str,
        role: str,
        country_code: str,
    ) -> IssuedSessionRecord:
        account = self.get_account_by_actor(actor_id)
        normalized_email = _normalize_email(email)
        if account is None:
            account = IdentityAccount(
                actor_id=actor_id,
                display_name=display_name.strip(),
                email=normalized_email,
                phone_number=None,
                home_country_code=country_code,
                locale=f"en-{country_code}",
                password_recovery_required=False,
            )
            self.session.add(account)
        else:
            account.display_name = display_name.strip()
            account.email = normalized_email
            account.home_country_code = country_code
            account.locale = f"en-{country_code}"
        self.session.flush()
        self.ensure_membership(actor_id=actor_id, role=role, country_code=country_code)
        self.revoke_actor_sessions(actor_id=actor_id, reason="rotated_for_compat")
        raw_token, record = self.issue_session(
            settings=Settings(),
            actor_id=actor_id,
            role=role,
            country_code=country_code,
            issued_via="legacy_session_compat",
        )
        return IssuedSessionRecord(
            session_id=record.session_id,
            session_token=raw_token,
            actor_id=record.actor_id,
            display_name=record.display_name,
            email=record.email,
            role=record.role,
            country_code=record.country_code,
            locale=record.locale,
            organization_id=record.organization_id,
            organization_name=record.organization_name,
            consent_state=record.consent_state,
            policy_version=record.policy_version,
            consent_scope_ids=list(record.consent_scope_ids),
            consent_channel=record.consent_channel,
            consent_captured_at=record.consent_captured_at,
            consent_revoked_at=record.consent_revoked_at,
        )

    def revoke_session(self, *, session_id: str, reason: str) -> IdentitySessionRecord:
        record = self.get_session_by_session_id(session_id)
        if record is None:
            raise ValueError("identity_session_not_found")
        record.revoked_at = utcnow()
        record.revoke_reason = reason
        self.session.flush()
        return record

    def revoke_actor_sessions(
        self,
        *,
        actor_id: str,
        reason: str,
        exclude_session_id: str | None = None,
    ) -> None:
        statement = select(IdentitySessionRecord).where(IdentitySessionRecord.actor_id == actor_id)
        for record in self.session.execute(statement).scalars().all():
            if exclude_session_id and record.session_id == exclude_session_id:
                continue
            if record.revoked_at is None:
                record.revoked_at = utcnow()
                record.revoke_reason = reason
        self.session.flush()

    def refresh_session(
        self,
        *,
        settings: Settings,
        session_id: str,
    ) -> tuple[str, IdentitySessionRecord]:
        record = self.get_session_by_session_id(session_id)
        if record is None:
            raise ValueError("identity_session_not_found")
        now = utcnow()
        if record.revoked_at is not None:
            raise ValueError("identity_session_revoked")
        if ensure_utc(record.expires_at) <= now:
            record.revoked_at = now
            record.revoke_reason = "expired"
            self.session.flush()
            raise ValueError("identity_session_expired")

        raw_token = token_hex(32)
        record.session_token = hash_access_token(raw_token)
        record.refreshed_at = now
        record.last_seen_at = now
        record.expires_at = now + timedelta(minutes=settings.auth_session_ttl_minutes)
        self.session.flush()
        return raw_token, record

    def search_sessions(
        self,
        *,
        query: str,
        country_code: str,
        exclude_actor_id: str | None = None,
        limit: int = 10,
    ) -> list[ActorSearchMatch]:
        pattern = f"%{query.strip().lower()}%"
        statement = (
            select(IdentityAccount, IdentityMembership)
            .join(IdentityMembership, IdentityMembership.actor_id == IdentityAccount.actor_id)
            .where(
                IdentityMembership.country_code == country_code,
                or_(
                    func.lower(IdentityAccount.display_name).like(pattern),
                    func.lower(IdentityAccount.email).like(pattern),
                    func.lower(IdentityAccount.actor_id).like(pattern),
                ),
            )
            .order_by(IdentityAccount.display_name.asc(), IdentityMembership.role.asc())
            .limit(limit)
        )
        if exclude_actor_id is not None:
            statement = statement.where(IdentityAccount.actor_id != exclude_actor_id)
        matches: list[ActorSearchMatch] = []
        seen: set[tuple[str, str]] = set()
        for account, membership in self.session.execute(statement).all():
            key = (account.actor_id, membership.role)
            if key in seen:
                continue
            seen.add(key)
            matches.append(
                ActorSearchMatch(
                    actor_id=account.actor_id,
                    display_name=account.display_name,
                    email=account.email,
                    role=membership.role,
                    country_code=membership.country_code,
                    organization_name=_organization_fields(account.actor_id, membership.country_code)[1],
                )
            )
        return matches

    def list_role_directory(
        self,
        *,
        country_code: str,
        role: str,
        exclude_actor_id: str | None = None,
        limit: int = 50,
    ) -> list[ActorSearchMatch]:
        statement = (
            select(IdentityAccount, IdentityMembership)
            .join(IdentityMembership, IdentityMembership.actor_id == IdentityAccount.actor_id)
            .where(
                IdentityMembership.country_code == country_code,
                IdentityMembership.role == role,
            )
            .order_by(IdentityAccount.display_name.asc(), IdentityMembership.id.asc())
            .limit(limit)
        )
        if exclude_actor_id is not None:
            statement = statement.where(IdentityAccount.actor_id != exclude_actor_id)

        items: list[ActorSearchMatch] = []
        for account, membership in self.session.execute(statement).all():
            items.append(
                ActorSearchMatch(
                    actor_id=account.actor_id,
                    display_name=account.display_name,
                    email=account.email,
                    role=membership.role,
                    country_code=membership.country_code,
                    organization_name=_organization_fields(account.actor_id, membership.country_code)[1],
                )
            )
        return items

    def _latest_consent(self, actor_id: str) -> ConsentRecord | None:
        statement = (
            select(ConsentRecord)
            .where(ConsentRecord.actor_id == actor_id)
            .order_by(ConsentRecord.created_at.desc(), ConsentRecord.id.desc())
        )
        return self.session.execute(statement).scalars().first()

    def _update_active_sessions_for_consent(
        self,
        *,
        actor_id: str,
        country_code: str,
        consent_state: str,
        policy_version: str | None,
        scope_ids: list[str],
        captured_at,
        revoked_at,
    ) -> None:
        statement = select(IdentitySessionRecord).where(
            IdentitySessionRecord.actor_id == actor_id,
            IdentitySessionRecord.country_code == country_code,
            IdentitySessionRecord.revoked_at.is_(None),
        )
        for record in self.session.execute(statement).scalars().all():
            record.consent_state = consent_state
            record.policy_version = policy_version
            record.consent_scope_ids = sorted(scope_ids)
            record.consent_channel = "pwa" if consent_state == "consent_granted" else None
            record.consent_captured_at = captured_at
            record.consent_revoked_at = revoked_at
        self.session.flush()

    def grant_consent(
        self,
        *,
        actor_id: str,
        country_code: str,
        policy_version: str,
        scope_ids: list[str],
        captured_at,
        session_id: str | None = None,
    ) -> IdentitySessionRecord:
        session_record = (
            self.get_session_by_session_id(session_id)
            if session_id is not None
            else self.get_session_by_actor(actor_id)
        )
        if session_record is None:
            raise ValueError("identity session not found")

        statement = select(ConsentRecord).where(
            ConsentRecord.actor_id == actor_id,
            ConsentRecord.consent_type == "regulated_mutation",
            ConsentRecord.policy_version == policy_version,
        )
        consent = self.session.execute(statement).scalar_one_or_none()
        if consent is None:
            consent = ConsentRecord(
                actor_id=actor_id,
                consent_type="regulated_mutation",
                status="granted",
                policy_version=policy_version,
                country_code=country_code,
            )
            self.session.add(consent)
        else:
            consent.status = "granted"
            consent.country_code = country_code

        self._update_active_sessions_for_consent(
            actor_id=actor_id,
            country_code=country_code,
            consent_state="consent_granted",
            policy_version=policy_version,
            scope_ids=scope_ids,
            captured_at=captured_at,
            revoked_at=None,
        )
        self.session.flush()
        return session_record

    def revoke_consent(
        self,
        *,
        actor_id: str,
        country_code: str,
        session_id: str | None = None,
    ) -> IdentitySessionRecord:
        session_record = (
            self.get_session_by_session_id(session_id)
            if session_id is not None
            else self.get_session_by_actor(actor_id)
        )
        if session_record is None:
            raise ValueError("identity session not found")

        statement = select(ConsentRecord).where(
            ConsentRecord.actor_id == actor_id,
            ConsentRecord.consent_type == "regulated_mutation",
            ConsentRecord.policy_version == (session_record.policy_version or "unknown"),
        )
        consent = self.session.execute(statement).scalar_one_or_none()
        if consent is None:
            consent = ConsentRecord(
                actor_id=actor_id,
                consent_type="regulated_mutation",
                status="revoked",
                policy_version=session_record.policy_version or "unknown",
                country_code=country_code,
            )
            self.session.add(consent)
        else:
            consent.status = "revoked"
            consent.country_code = country_code

        revoked_at = utcnow()
        self._update_active_sessions_for_consent(
            actor_id=actor_id,
            country_code=country_code,
            consent_state="consent_revoked",
            policy_version=session_record.policy_version,
            scope_ids=[],
            captured_at=session_record.consent_captured_at,
            revoked_at=revoked_at,
        )
        self.session.flush()
        return session_record

    def build_session_payload(self, record: SessionPayloadRecord) -> dict[str, object]:
        available_roles = [
            membership.role for membership in self.list_memberships(
                actor_id=record.actor_id,
                country_code=record.country_code,
            )
        ]
        return {
            "actor": {
                "actor_id": record.actor_id,
                "display_name": record.display_name,
                "email": record.email,
                "role": record.role,
                "country_code": record.country_code,
                "locale": record.locale,
                "membership": {
                    "organization_id": record.organization_id,
                    "organization_name": record.organization_name,
                    "role": record.role,
                },
            },
            "consent": {
                "actor_id": record.actor_id,
                "country_code": record.country_code,
                "state": record.consent_state,
                "policy_version": record.policy_version,
                "scope_ids": record.consent_scope_ids,
                "channel": record.consent_channel,
                "captured_at": record.consent_captured_at.isoformat() if record.consent_captured_at else None,
                "revoked_at": record.consent_revoked_at.isoformat() if record.consent_revoked_at else None,
            },
            "available_roles": available_roles or [record.role],
            "workspace": workspace_payload_for_session_record(record),
        }
