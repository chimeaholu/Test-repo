import pytest

from agro_v2.identity_consent import (
    ConsentCapture,
    IdentityConsentError,
    IdentityConsentService,
    IdentityState,
)


def build_capture(**overrides) -> ConsentCapture:
    payload = {
        "policy_version": "2026-04",
        "scope_ids": ("marketplace", "advisory"),
        "channel": "whatsapp",
        "captured_at": "2026-04-13T09:55:00+00:00",
    }
    payload.update(overrides)
    return ConsentCapture(**payload)


def test_identity_lifecycle_supports_capture_and_revoke():
    service = IdentityConsentService()

    identified = service.begin_identity("farmer-001", "gh")
    pending = service.require_consent(identified)
    granted = service.capture_consent(pending, build_capture())
    revoked = service.revoke_consent(granted, revoked_at="2026-04-13T10:00:00+00:00")

    assert identified.state == IdentityState.IDENTIFIED
    assert pending.state == IdentityState.CONSENT_PENDING
    assert granted.state == IdentityState.CONSENT_GRANTED
    assert granted.consent_scope_ids == ("advisory", "marketplace")
    assert revoked.state == IdentityState.CONSENT_REVOKED
    assert revoked.consent_revoked_at == "2026-04-13T10:00:00+00:00"


def test_capture_can_happen_directly_from_identified_state():
    service = IdentityConsentService()
    granted = service.capture_consent(
        service.begin_identity("farmer-002", "NG"),
        build_capture(channel="pwa"),
    )

    snapshot = service.snapshot(granted)

    assert snapshot["country_code"] == "NG"
    assert snapshot["state"] == "consent_granted"
    assert snapshot["consent_channel"] == "pwa"


def test_invalid_transition_is_rejected():
    service = IdentityConsentService()
    identified = service.begin_identity("farmer-003", "JM")

    with pytest.raises(IdentityConsentError, match="not allowed for transition"):
        service.revoke_consent(identified, revoked_at="2026-04-13T10:00:00+00:00")


def test_granted_record_requires_capture_details():
    with pytest.raises(IdentityConsentError, match="granted consent requires captured policy details"):
        from agro_v2.identity_consent import IdentityConsentRecord

        IdentityConsentRecord(
            farmer_id="farmer-004",
            country_code="GH",
            state=IdentityState.CONSENT_GRANTED,
        )


def test_capture_requires_non_empty_scope_ids():
    with pytest.raises(IdentityConsentError, match="scope_ids must not be empty"):
        build_capture(scope_ids=())
