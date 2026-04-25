import pytest

from agro_v2.accessibility_readability_pack import AccessibilityWorkflowReport
from agro_v2.android_mobile_ux_harness import AndroidUxSuiteReport
from agro_v2.android_performance_harness import AndroidMatrixId
from agro_v2.interaction_feedback_library import CriticalFlow
from agro_v2.ux_excellence_review_gate import (
    ConversionMetric,
    ReviewFindingSeverity,
    UxExcellenceDesignReviewGate,
    UxExcellenceReviewError,
    UxReviewCheck,
    UxReviewFinding,
    UxReviewPhase,
    UxReviewRequest,
)


def build_accessibility_report(**overrides) -> AccessibilityWorkflowReport:
    payload = {
        "passed": True,
        "reviewed_items": 20,
        "missing_pairs": (),
        "failing_pairs": (),
        "covered_flows": ("listing_create", "negotiation_reply"),
    }
    payload.update(overrides)
    return AccessibilityWorkflowReport(**payload)


def build_android_report(**overrides) -> AndroidUxSuiteReport:
    payload = {
        "passed": True,
        "evaluations": (),
        "covered_matrix_ids": (
            AndroidMatrixId.ARM_001,
            AndroidMatrixId.ARM_002,
            AndroidMatrixId.ARM_003,
            AndroidMatrixId.ARM_004,
        ),
        "covered_flows": (
            CriticalFlow.LISTING_CREATE,
            CriticalFlow.NEGOTIATION_REPLY,
        ),
    }
    payload.update(overrides)
    return AndroidUxSuiteReport(**payload)


def build_metrics(**overrides) -> tuple[ConversionMetric, ...]:
    metrics = {
        "onboarding_completion": ConversionMetric("onboarding_completion", actual=0.92, threshold=0.8),
        "offer_to_settlement_completion": ConversionMetric(
            "offer_to_settlement_completion",
            actual=0.88,
            threshold=0.75,
        ),
        "advisory_follow_through": ConversionMetric("advisory_follow_through", actual=0.86, threshold=0.7),
        "dispute_resolution_completion": ConversionMetric(
            "dispute_resolution_completion",
            actual=0.83,
            threshold=0.7,
        ),
    }
    metrics.update(overrides)
    return tuple(metrics.values())


def build_request(**overrides) -> UxReviewRequest:
    payload = {
        "review_id": "ux-gate-001",
        "phase": UxReviewPhase.PRE_BUILD,
        "visual_language_approved": True,
        "interaction_patterns_approved": True,
        "accessibility_report": build_accessibility_report(),
        "trust_signals": (
            "confirmation_clarity",
            "ai_explainability",
            "offline_recovery",
            "support_path",
        ),
        "usability_heuristics_passed": True,
        "conversion_metrics": build_metrics(),
        "android_report": build_android_report(),
        "findings": (),
    }
    payload.update(overrides)
    return UxReviewRequest(**payload)


def test_pre_build_gate_emits_complete_checklist_and_passes_with_full_evidence():
    outcome = UxExcellenceDesignReviewGate().review(build_request())

    assert outcome.passed is True
    assert outcome.blocking_reason_codes == ()
    assert [item.check for item in outcome.checklist] == [
        UxReviewCheck.VISUAL_LANGUAGE,
        UxReviewCheck.INTERACTION_PATTERNS,
        UxReviewCheck.ACCESSIBILITY_BASELINE,
        UxReviewCheck.TRUST_PATTERN_CHECKLIST,
    ]


def test_pre_release_gate_emits_complete_checklist_and_passes_with_full_evidence():
    outcome = UxExcellenceDesignReviewGate().review(
        build_request(phase=UxReviewPhase.PRE_RELEASE)
    )

    assert outcome.passed is True
    assert [item.check for item in outcome.checklist] == [
        UxReviewCheck.USABILITY_HEURISTICS,
        UxReviewCheck.CONVERSION_METRICS,
        UxReviewCheck.LOW_END_ANDROID,
        UxReviewCheck.GENERIC_PATTERN_AUDIT,
    ]


def test_gate_fails_when_trust_checklist_is_incomplete():
    outcome = UxExcellenceDesignReviewGate().review(
        build_request(trust_signals=("confirmation_clarity", "support_path"))
    )

    assert outcome.passed is False
    assert outcome.missing_trust_signals == ("ai_explainability", "offline_recovery")
    assert "trust_patterns_incomplete" in outcome.blocking_reason_codes


def test_pre_release_gate_classifies_generic_pattern_findings_as_blockers():
    outcome = UxExcellenceDesignReviewGate().review(
        build_request(
            phase=UxReviewPhase.PRE_RELEASE,
            findings=(
                UxReviewFinding(
                    finding_id="template_like_layout",
                    summary="Screen falls back to stock template composition.",
                    severity=ReviewFindingSeverity.BLOCKER,
                ),
                UxReviewFinding(
                    finding_id="minor_spacing_followup",
                    summary="Spacing polish remains for a secondary card.",
                    severity=ReviewFindingSeverity.NON_BLOCKER,
                ),
            ),
        )
    )

    assert outcome.passed is False
    assert outcome.generic_blockers == ("template_like_layout",)
    assert "generic_pattern_detected" in outcome.blocking_reason_codes


def test_pre_release_gate_flags_missing_or_underperforming_metrics():
    outcome = UxExcellenceDesignReviewGate().review(
        build_request(
            phase=UxReviewPhase.PRE_RELEASE,
            conversion_metrics=(
                ConversionMetric("onboarding_completion", actual=0.79, threshold=0.8),
                ConversionMetric("offer_to_settlement_completion", actual=0.88, threshold=0.75),
            ),
        )
    )

    assert outcome.passed is False
    assert outcome.missing_metric_ids == (
        "advisory_follow_through",
        "dispute_resolution_completion",
    )
    assert "conversion_metrics_incomplete" in outcome.blocking_reason_codes


def test_request_validates_metric_identity():
    with pytest.raises(UxExcellenceReviewError, match="metric_id is required"):
        ConversionMetric(metric_id=" ", actual=1.0, threshold=0.8)
