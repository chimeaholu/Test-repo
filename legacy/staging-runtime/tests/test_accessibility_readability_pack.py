import pytest

from agro_v2.accessibility_readability_pack import (
    AccessibilityReadabilityCompliancePack,
    AccessibilityReadabilityError,
    AccessibilityReviewItem,
    build_default_accessibility_readability_pack,
)
from agro_v2.interaction_feedback_library import CriticalFlow, InteractionState
from agro_v2.visual_language_system import build_default_visual_language_system


def build_review_item(
    flow: CriticalFlow,
    state: InteractionState,
    *,
    component_name: str | None = None,
    **overrides,
) -> AccessibilityReviewItem:
    component = component_name or (
        "primary_button"
        if state in {InteractionState.LOADING, InteractionState.RETRY, InteractionState.TRUST}
        else "body_card"
    )
    payload = {
        "flow": flow,
        "state": state,
        "component_name": component,
        "reading_grade": 4.8 if component == "primary_button" else 5.8,
        "font_size_px": 16,
        "contrast_ratio": 4.8,
        "tap_target_px": 48 if component == "primary_button" else 44,
        "primary_action_words": 1 if component == "primary_button" else 2,
        "has_visual_label": True,
        "screen_reader_label": f"{flow.value}-{state.value}",
        "has_voice_hint": state
        not in {InteractionState.ERROR, InteractionState.OFFLINE, InteractionState.RETRY},
        "support_contact_visible": state
        not in {InteractionState.ERROR, InteractionState.OFFLINE, InteractionState.RETRY},
    }
    payload.update(overrides)
    return AccessibilityReviewItem(**payload)


def test_default_pack_declares_registered_components_and_voice_hint_states():
    pack = build_default_accessibility_readability_pack()
    snapshot = pack.compliance_snapshot()

    assert snapshot["standard_count"] == 2
    assert snapshot["components"] == ["body_card", "primary_button"]
    assert snapshot["voice_hint_states"]["body_card"] == ["error", "offline", "retry"]


def test_audit_passes_for_low_literacy_ready_retry_state():
    pack = build_default_accessibility_readability_pack()

    audit = pack.audit(
        build_review_item(
            CriticalFlow.NEGOTIATION_REPLY,
            InteractionState.RETRY,
            component_name="primary_button",
            has_voice_hint=True,
            support_contact_visible=True,
        )
    )

    assert audit.passed is True
    assert audit.literacy_band.value == "low_literacy"
    assert audit.ux_journey_id == "UXJ-003"
    assert audit.ux_data_check_id == "UXDI-003"


def test_audit_rejects_readability_and_accessibility_regressions():
    pack = build_default_accessibility_readability_pack()

    audit = pack.audit(
        build_review_item(
            CriticalFlow.ADVISORY_REQUEST,
            InteractionState.ERROR,
            reading_grade=7.5,
            contrast_ratio=3.9,
            has_voice_hint=False,
            support_contact_visible=False,
        )
    )

    assert audit.passed is False
    assert "reading_grade_too_high" in audit.issues
    assert "contrast_ratio_too_low" in audit.issues
    assert "voice_hint_missing" in audit.issues
    assert "support_contact_missing" in audit.issues


def test_validate_workflow_requires_complete_flow_state_coverage():
    pack = build_default_accessibility_readability_pack()
    review_items = tuple(
        build_review_item(flow, state)
        for flow in CriticalFlow
        for state in InteractionState
        if not (flow == CriticalFlow.LISTING_CREATE and state == InteractionState.ERROR)
    )

    report = pack.validate_workflow(review_items)

    assert report.passed is False
    assert "listing_create:error" in report.missing_pairs


def test_pack_rejects_unknown_component_standard():
    with pytest.raises(
        AccessibilityReadabilityError,
        match="unknown component ghost_component",
    ):
        AccessibilityReadabilityCompliancePack(
            visual_system=build_default_visual_language_system(),
            interaction_library=build_default_accessibility_readability_pack().interaction_library,
            standards=(
                (
                    build_default_accessibility_readability_pack()
                    ._get_standard("body_card")
                ),
                type(build_default_accessibility_readability_pack()._get_standard("body_card"))(
                    component_name="ghost_component",
                    max_reading_grade=6.0,
                    min_font_size_px=16,
                    min_contrast_ratio=4.5,
                    min_tap_target_px=44,
                    max_primary_action_words=3,
                ),
            ),
        )
