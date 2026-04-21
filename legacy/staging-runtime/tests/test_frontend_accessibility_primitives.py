from agro_v2.accessibility_readability_pack import AccessibilityReviewItem
from agro_v2.frontend_accessibility_primitives import (
    FrontendAccessibilityPrimitiveError,
    build_default_frontend_accessibility_primitives,
)
from agro_v2.interaction_feedback_library import CriticalFlow, InteractionState
import pytest


def test_field_helpers_and_focus_paths_are_plain_language_and_route_bound():
    primitives = build_default_frontend_accessibility_primitives()

    helper = primitives.helper_for("consent-language")
    focus_path = primitives.focus_path_for("/onboarding/consent")

    assert len(helper.helper_text.split()) <= helper.max_words
    assert focus_path.elements[0] == "skip-link"
    assert focus_path.elements[-1] == "primary-action"


def test_accessibility_audit_flags_long_cta_copy():
    primitives = build_default_frontend_accessibility_primitives()
    audit = primitives.audit_review_item(
        AccessibilityReviewItem(
            flow=CriticalFlow.LISTING_CREATE,
            state=InteractionState.RETRY,
            component_name="primary_button",
            reading_grade=4.5,
            font_size_px=16,
            contrast_ratio=4.8,
            tap_target_px=48,
            primary_action_words=4,
            has_visual_label=True,
            screen_reader_label="Retry listing publish",
            has_voice_hint=True,
            support_contact_visible=True,
        )
    )

    assert audit.passed is False
    assert "cta_exceeds_plain_language_budget" in audit.issues


def test_unknown_focus_path_is_rejected():
    primitives = build_default_frontend_accessibility_primitives()

    with pytest.raises(FrontendAccessibilityPrimitiveError, match="unknown focus path"):
        primitives.focus_path_for("/app/unknown")
