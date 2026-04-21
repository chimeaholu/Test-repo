"""F-005 accessibility and readability primitives for routed UI surfaces."""

from __future__ import annotations

from dataclasses import dataclass

from .accessibility_readability_pack import (
    AccessibilityReadabilityCompliancePack,
    AccessibilityReviewItem,
    build_default_accessibility_readability_pack,
)
from .interaction_feedback_library import CriticalFlow, InteractionState


class FrontendAccessibilityPrimitiveError(ValueError):
    """Raised when accessibility primitives or focus helpers are invalid."""


@dataclass(frozen=True)
class FieldHelperCopy:
    field_id: str
    helper_text: str
    screen_reader_label: str
    max_words: int

    def __post_init__(self) -> None:
        if not self.field_id.strip():
            raise FrontendAccessibilityPrimitiveError("field_id is required")
        if not self.helper_text.strip():
            raise FrontendAccessibilityPrimitiveError("helper_text is required")
        if not self.screen_reader_label.strip():
            raise FrontendAccessibilityPrimitiveError("screen_reader_label is required")
        if self.max_words <= 0:
            raise FrontendAccessibilityPrimitiveError("max_words must be > 0")


@dataclass(frozen=True)
class FocusPath:
    route: str
    elements: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.route.startswith("/"):
            raise FrontendAccessibilityPrimitiveError("route must start with '/'")
        if not self.elements:
            raise FrontendAccessibilityPrimitiveError("elements must not be empty")


@dataclass(frozen=True)
class AccessibilityPrimitiveAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendAccessibilityPrimitives:
    """Adds field helper, focus-order, and copy constraints on top of B-052."""

    def __init__(
        self,
        *,
        compliance_pack: AccessibilityReadabilityCompliancePack,
    ) -> None:
        self.compliance_pack = compliance_pack
        self._field_helpers = {
            "consent-phone": FieldHelperCopy(
                field_id="consent-phone",
                helper_text="Use the number you check now.",
                screen_reader_label="Phone number for Agrodomain sign-in",
                max_words=7,
            ),
            "consent-language": FieldHelperCopy(
                field_id="consent-language",
                helper_text="Pick the language you read fastest.",
                screen_reader_label="Preferred language for consent screens",
                max_words=7,
            ),
        }
        self._focus_paths = {
            "/onboarding/consent": FocusPath(
                route="/onboarding/consent",
                elements=("skip-link", "headline", "progress", "consent-summary", "primary-action"),
            ),
            "/app/profile": FocusPath(
                route="/app/profile",
                elements=("skip-link", "headline", "consent-card", "policy-link", "primary-action"),
            ),
        }

    def helper_for(self, field_id: str) -> FieldHelperCopy:
        try:
            return self._field_helpers[field_id]
        except KeyError as exc:
            raise FrontendAccessibilityPrimitiveError(f"unknown field helper: {field_id}") from exc

    def focus_path_for(self, route: str) -> FocusPath:
        try:
            return self._focus_paths[route]
        except KeyError as exc:
            raise FrontendAccessibilityPrimitiveError(f"unknown focus path: {route}") from exc

    def audit_review_item(self, item: AccessibilityReviewItem) -> AccessibilityPrimitiveAudit:
        issues: list[str] = list(self.compliance_pack.audit(item).issues)
        if item.component_name == "primary_button" and item.primary_action_words > 2:
            issues.append("cta_exceeds_plain_language_budget")
        if not item.screen_reader_label.strip():
            issues.append("screen_reader_label_missing")
        return AccessibilityPrimitiveAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="keyboard-contrast-reading-level",
            ux_data_check_id="F-005",
        )


def build_default_frontend_accessibility_primitives() -> FrontendAccessibilityPrimitives:
    return FrontendAccessibilityPrimitives(
        compliance_pack=build_default_accessibility_readability_pack()
    )
