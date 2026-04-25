"""F-002 consent and identity UI surfaces for onboarding and profile recovery."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .frontend_app_shell import AppRole
from .identity_consent import IdentityConsentRecord, IdentityState
from .multilingual_delivery import DeliveryAudience, MultilingualDeliveryFramework


class FrontendConsentUiError(ValueError):
    """Raised when onboarding or profile consent UI inputs are invalid."""


class ConsentRouteDecision(str, Enum):
    ALLOW = "allow"
    REDIRECT_TO_CONSENT = "redirect_to_consent"
    REDIRECT_TO_SIGNIN = "redirect_to_signin"


@dataclass(frozen=True)
class ConsentStep:
    step_id: str
    title: str
    status: str

    def __post_init__(self) -> None:
        if not self.step_id.strip():
            raise FrontendConsentUiError("step_id is required")
        if not self.title.strip():
            raise FrontendConsentUiError("title is required")
        if self.status not in {"todo", "current", "done"}:
            raise FrontendConsentUiError("status must be todo, current, or done")


@dataclass(frozen=True)
class ConsentSurface:
    role: AppRole
    route: str
    headline: str
    body: str
    language_code: str
    steps: tuple[ConsentStep, ...]
    primary_action: str
    secondary_action: str | None
    consent_state: IdentityState
    route_decision: ConsentRouteDecision
    proof_labels: tuple[str, ...]


@dataclass(frozen=True)
class ConsentUiAuditResult:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendConsentUi:
    """Projects onboarding and profile consent states into explicit routed surfaces."""

    def __init__(
        self,
        *,
        delivery_framework: MultilingualDeliveryFramework | None = None,
    ) -> None:
        self.delivery_framework = delivery_framework or MultilingualDeliveryFramework()

    def build_onboarding_surface(
        self,
        *,
        role: AppRole,
        record: IdentityConsentRecord,
        preferred_locale: str | None = None,
    ) -> ConsentSurface:
        language_code, _ = self.delivery_framework.resolve_locale(
            audience=DeliveryAudience(
                country_code=record.country_code,
                preferred_locale=preferred_locale,
                fallback_locale="en",
                channel="pwa",
            ),
            available_locales=("en", "en-gh", "en-ng", "en-jm", "fr"),
        )
        decision = self.route_decision(record)
        body_map = {
            IdentityState.IDENTIFIED: "Confirm consent permissions so the next task stays safe.",
            IdentityState.CONSENT_PENDING: "Review what Agrodomain can use before you continue consent.",
            IdentityState.CONSENT_GRANTED: "Consent is complete. Continue to your work queue.",
            IdentityState.CONSENT_REVOKED: "Consent was removed. Review consent permissions to continue.",
            IdentityState.ANONYMOUS: "Sign in first so we can load the right workspace.",
        }
        action_map = {
            IdentityState.IDENTIFIED: "Review consent",
            IdentityState.CONSENT_PENDING: "Grant consent",
            IdentityState.CONSENT_GRANTED: "Open workspace",
            IdentityState.CONSENT_REVOKED: "Restore consent",
            IdentityState.ANONYMOUS: "Sign in",
        }
        return ConsentSurface(
            role=role,
            route="/onboarding/consent",
            headline="Set up identity and consent",
            body=body_map[record.state],
            language_code=language_code,
            steps=self._steps_for(record.state),
            primary_action=action_map[record.state],
            secondary_action="Choose language",
            consent_state=record.state,
            route_decision=decision,
            proof_labels=("policy version", "country rule", "channel"),
        )

    def build_profile_surface(
        self,
        *,
        role: AppRole,
        record: IdentityConsentRecord,
    ) -> ConsentSurface:
        if record.state not in {IdentityState.CONSENT_GRANTED, IdentityState.CONSENT_REVOKED}:
            raise FrontendConsentUiError("profile consent UI requires granted or revoked consent")
        primary_action = "Revoke consent" if record.state == IdentityState.CONSENT_GRANTED else "Grant consent"
        return ConsentSurface(
            role=role,
            route="/app/profile",
            headline="Consent and permissions",
            body="Your permissions update immediately across routes and badges.",
            language_code="en",
            steps=self._steps_for(record.state),
            primary_action=primary_action,
            secondary_action="Review policy",
            consent_state=record.state,
            route_decision=self.route_decision(record),
            proof_labels=("policy version", "captured at", "channel"),
        )

    def route_decision(self, record: IdentityConsentRecord) -> ConsentRouteDecision:
        if record.state == IdentityState.ANONYMOUS:
            return ConsentRouteDecision.REDIRECT_TO_SIGNIN
        if record.state in {IdentityState.IDENTIFIED, IdentityState.CONSENT_PENDING, IdentityState.CONSENT_REVOKED}:
            return ConsentRouteDecision.REDIRECT_TO_CONSENT
        return ConsentRouteDecision.ALLOW

    def audit_surface(self, surface: ConsentSurface) -> ConsentUiAuditResult:
        issues: list[str] = []
        if not surface.steps:
            issues.append("steps_missing")
        if surface.consent_state != IdentityState.CONSENT_GRANTED and surface.route_decision == ConsentRouteDecision.ALLOW:
            issues.append("guard_missing")
        if len(surface.primary_action.split()) > 2:
            issues.append("primary_action_too_long")
        if "permission" not in surface.body.lower() and "consent" not in surface.body.lower():
            issues.append("consent_language_missing")
        return ConsentUiAuditResult(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C01",
            ux_data_check_id="FJ-D01",
        )

    def _steps_for(self, state: IdentityState) -> tuple[ConsentStep, ...]:
        statuses = {
            IdentityState.ANONYMOUS: ("current", "todo", "todo"),
            IdentityState.IDENTIFIED: ("done", "current", "todo"),
            IdentityState.CONSENT_PENDING: ("done", "current", "todo"),
            IdentityState.CONSENT_GRANTED: ("done", "done", "done"),
            IdentityState.CONSENT_REVOKED: ("done", "current", "todo"),
        }[state]
        return (
            ConsentStep("identity", "Confirm identity", statuses[0]),
            ConsentStep("consent", "Review consent", statuses[1]),
            ConsentStep("language", "Choose language", statuses[2]),
        )
