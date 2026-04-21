from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.platform import (
    ConsentRecord,
    IdentityMembership,
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


class IdentityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def ensure_membership(self, *, actor_id: str, role: str, country_code: str) -> IdentityMembership:
        statement = select(IdentityMembership).where(
            IdentityMembership.actor_id == actor_id,
            IdentityMembership.role == role,
        )
        record = self.session.execute(statement).scalar_one_or_none()
        if record is None:
            record = IdentityMembership(
                actor_id=actor_id,
                role=role,
                country_code=country_code,
                provenance={"seeded": False, "source": "identity.session.sign_in"},
            )
            self.session.add(record)
            self.session.flush()
            return record

        record.country_code = country_code
        record.provenance = {"seeded": False, "source": "identity.session.sign_in"}
        self.session.flush()
        return record

    def get_session_by_token(self, token: str) -> IdentitySessionRecord | None:
        statement = select(IdentitySessionRecord).where(
            IdentitySessionRecord.session_token == token
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_session_by_actor(self, actor_id: str) -> IdentitySessionRecord | None:
        statement = select(IdentitySessionRecord).where(
            IdentitySessionRecord.actor_id == actor_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def _latest_consent(self, actor_id: str) -> ConsentRecord | None:
        statement = (
            select(ConsentRecord)
            .where(ConsentRecord.actor_id == actor_id)
            .order_by(ConsentRecord.created_at.desc(), ConsentRecord.id.desc())
        )
        return self.session.execute(statement).scalars().first()

    def create_or_rotate_session(
        self,
        *,
        actor_id: str,
        display_name: str,
        email: str,
        role: str,
        country_code: str,
    ) -> IdentitySessionRecord:
        record = self.get_session_by_actor(actor_id)
        consent = self._latest_consent(actor_id)
        now = datetime.now(tz=UTC)
        if record is None:
            record = IdentitySessionRecord(
                actor_id=actor_id,
                session_token=uuid4().hex,
                display_name=display_name,
                email=email,
                role=role,
                country_code=country_code,
                locale=f"en-{country_code}",
                organization_id=_organization_id(country_code),
                organization_name=_organization_name(country_code),
                consent_state="consent_granted" if consent and consent.status == "granted" else "identified",
                policy_version=consent.policy_version if consent else None,
                consent_scope_ids=["identity.core", "workflow.audit"] if consent and consent.status == "granted" else [],
                consent_channel="pwa" if consent and consent.status == "granted" else None,
                consent_captured_at=now if consent and consent.status == "granted" else None,
                consent_revoked_at=None,
            )
            self.session.add(record)
            self.session.flush()
            return record

        record.session_token = uuid4().hex
        record.display_name = display_name
        record.email = email
        record.role = role
        record.country_code = country_code
        record.locale = f"en-{country_code}"
        record.organization_id = _organization_id(country_code)
        record.organization_name = _organization_name(country_code)
        if consent and consent.status == "granted":
            record.consent_state = "consent_granted"
            record.policy_version = consent.policy_version
            record.consent_scope_ids = ["identity.core", "workflow.audit"]
            record.consent_channel = "pwa"
            record.consent_captured_at = now
            record.consent_revoked_at = None
        else:
            record.consent_state = "identified"
            record.policy_version = None
            record.consent_scope_ids = []
            record.consent_channel = None
            record.consent_captured_at = None
            record.consent_revoked_at = None
        self.session.flush()
        return record

    def grant_consent(
        self,
        *,
        actor_id: str,
        country_code: str,
        policy_version: str,
        scope_ids: list[str],
        captured_at: datetime,
    ) -> IdentitySessionRecord:
        session_record = self.get_session_by_actor(actor_id)
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
        session_record.consent_state = "consent_granted"
        session_record.policy_version = policy_version
        session_record.consent_scope_ids = sorted(scope_ids)
        session_record.consent_channel = "pwa"
        session_record.consent_captured_at = captured_at
        session_record.consent_revoked_at = None
        self.session.flush()
        return session_record

    def revoke_consent(self, *, actor_id: str, country_code: str) -> IdentitySessionRecord:
        session_record = self.get_session_by_actor(actor_id)
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
        session_record.consent_state = "consent_revoked"
        session_record.consent_revoked_at = datetime.now(tz=UTC)
        self.session.flush()
        return session_record

    def build_session_payload(self, record: IdentitySessionRecord) -> dict[str, object]:
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
            "available_roles": [record.role],
        }
