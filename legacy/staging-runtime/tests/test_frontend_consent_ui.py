from agro_v2.frontend_app_shell import AppRole
from agro_v2.frontend_consent_ui import ConsentRouteDecision, FrontendConsentUi
from agro_v2.identity_consent import ConsentCapture, IdentityConsentService


def test_onboarding_surface_projects_pending_consent_into_guarded_route():
    service = IdentityConsentService()
    consent_ui = FrontendConsentUi()
    record = service.require_consent(service.begin_identity("farmer-001", "GH"))

    surface = consent_ui.build_onboarding_surface(
        role=AppRole.FARMER,
        record=record,
        preferred_locale="en-gh",
    )
    audit = consent_ui.audit_surface(surface)

    assert surface.route == "/onboarding/consent"
    assert surface.language_code == "en-gh"
    assert surface.route_decision == ConsentRouteDecision.REDIRECT_TO_CONSENT
    assert surface.steps[1].status == "current"
    assert audit.passed is True


def test_profile_surface_supports_immediate_revocation_state_projection():
    service = IdentityConsentService()
    consent_ui = FrontendConsentUi()
    granted = service.capture_consent(
        service.begin_identity("farmer-002", "NG"),
        ConsentCapture(
            policy_version="2026-04",
            scope_ids=("marketplace", "advisory"),
            channel="pwa",
            captured_at="2026-04-13T12:00:00+00:00",
        ),
    )
    revoked = service.revoke_consent(granted, revoked_at="2026-04-13T12:05:00+00:00")

    surface = consent_ui.build_profile_surface(role=AppRole.FARMER, record=revoked)

    assert surface.primary_action == "Grant consent"
    assert surface.route_decision == ConsentRouteDecision.REDIRECT_TO_CONSENT
    assert "permissions" in surface.body.lower()


def test_granted_consent_allows_route_access():
    service = IdentityConsentService()
    consent_ui = FrontendConsentUi()
    granted = service.capture_consent(
        service.begin_identity("farmer-003", "JM"),
        ConsentCapture(
            policy_version="2026-04",
            scope_ids=("marketplace",),
            channel="whatsapp",
            captured_at="2026-04-13T12:00:00+00:00",
        ),
    )

    assert consent_ui.route_decision(granted) == ConsentRouteDecision.ALLOW
