"""B-002 identity and consent service skeleton."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .country_pack import resolve_country_policy


class IdentityConsentError(ValueError):
    """Raised when identity or consent operations are malformed."""


class IdentityState(str, Enum):
    ANONYMOUS = "anonymous"
    IDENTIFIED = "identified"
    CONSENT_PENDING = "consent_pending"
    CONSENT_GRANTED = "consent_granted"
    CONSENT_REVOKED = "consent_revoked"


@dataclass(frozen=True)
class ConsentCapture:
    policy_version: str
    scope_ids: tuple[str, ...]
    channel: str
    captured_at: str

    def __post_init__(self) -> None:
        if not self.policy_version.strip():
            raise IdentityConsentError("policy_version is required")
        if not self.scope_ids:
            raise IdentityConsentError("scope_ids must not be empty")
        if not self.channel.strip():
            raise IdentityConsentError("channel is required")
        if not self.captured_at.strip():
            raise IdentityConsentError("captured_at is required")


@dataclass(frozen=True)
class IdentityConsentRecord:
    farmer_id: str
    country_code: str
    state: IdentityState
    policy_version: str | None = None
    consent_scope_ids: tuple[str, ...] = ()
    consent_channel: str | None = None
    consent_captured_at: str | None = None
    consent_revoked_at: str | None = None

    def __post_init__(self) -> None:
        if not self.farmer_id.strip():
            raise IdentityConsentError("farmer_id is required")
        resolve_country_policy(self.country_code)
        if self.state == IdentityState.CONSENT_GRANTED:
            if not self.policy_version or not self.consent_scope_ids or not self.consent_captured_at:
                raise IdentityConsentError("granted consent requires captured policy details")
        if self.state == IdentityState.CONSENT_REVOKED and not self.consent_revoked_at:
            raise IdentityConsentError("revoked consent requires consent_revoked_at")


class IdentityConsentService:
    """Tracks consent lifecycle transitions for farmer onboarding."""

    def begin_identity(self, farmer_id: str, country_code: str) -> IdentityConsentRecord:
        resolve_country_policy(country_code)
        return IdentityConsentRecord(
            farmer_id=farmer_id,
            country_code=country_code.upper(),
            state=IdentityState.IDENTIFIED,
        )

    def require_consent(self, record: IdentityConsentRecord) -> IdentityConsentRecord:
        self._assert_state(record, allowed=(IdentityState.IDENTIFIED,))
        return IdentityConsentRecord(
            farmer_id=record.farmer_id,
            country_code=record.country_code,
            state=IdentityState.CONSENT_PENDING,
        )

    def capture_consent(
        self,
        record: IdentityConsentRecord,
        capture: ConsentCapture,
    ) -> IdentityConsentRecord:
        self._assert_state(record, allowed=(IdentityState.IDENTIFIED, IdentityState.CONSENT_PENDING))
        return IdentityConsentRecord(
            farmer_id=record.farmer_id,
            country_code=record.country_code,
            state=IdentityState.CONSENT_GRANTED,
            policy_version=capture.policy_version,
            consent_scope_ids=tuple(sorted(set(capture.scope_ids))),
            consent_channel=capture.channel,
            consent_captured_at=capture.captured_at,
        )

    def revoke_consent(
        self,
        record: IdentityConsentRecord,
        *,
        revoked_at: str,
    ) -> IdentityConsentRecord:
        self._assert_state(record, allowed=(IdentityState.CONSENT_GRANTED,))
        if not revoked_at.strip():
            raise IdentityConsentError("revoked_at is required")
        return IdentityConsentRecord(
            farmer_id=record.farmer_id,
            country_code=record.country_code,
            state=IdentityState.CONSENT_REVOKED,
            policy_version=record.policy_version,
            consent_scope_ids=record.consent_scope_ids,
            consent_channel=record.consent_channel,
            consent_captured_at=record.consent_captured_at,
            consent_revoked_at=revoked_at,
        )

    def snapshot(self, record: IdentityConsentRecord) -> dict[str, object]:
        return {
            "farmer_id": record.farmer_id,
            "country_code": record.country_code,
            "state": record.state.value,
            "policy_version": record.policy_version,
            "consent_scope_ids": list(record.consent_scope_ids),
            "consent_channel": record.consent_channel,
            "consent_captured_at": record.consent_captured_at,
            "consent_revoked_at": record.consent_revoked_at,
        }

    def _assert_state(
        self,
        record: IdentityConsentRecord,
        *,
        allowed: tuple[IdentityState, ...],
    ) -> None:
        if record.state not in allowed:
            allowed_names = ", ".join(state.value for state in allowed)
            raise IdentityConsentError(
                f"state {record.state.value} not allowed for transition; expected one of: {allowed_names}"
            )
