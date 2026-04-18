import pytest

from agro_v2.plan_adversarial_review_gate import (
    BeadDesignReview,
    PlanAdversarialReviewError,
    PlanAdversarialReviewGate,
    PlanReviewCheck,
    PlanReviewRequest,
)


def build_review(bead_id: str, **overrides) -> BeadDesignReview:
    payload = {
        "bead_id": bead_id,
        "scope_summary": f"{bead_id} scope summary",
        "dependency_ids": ("B-001",),
        "unit_test_obligations": ("unit coverage",),
        "e2e_journeys": ("n/a",),
        "data_checks": ("traceability matrix integrity",),
        "workflow_specs": ("workflow spec",),
        "risk_controls": ("risk control",),
        "test_expansion_items": ("test expansion",),
        "blocker_labels": (),
        "non_blocker_labels": ("documentation_followup",),
    }
    payload.update(overrides)
    return BeadDesignReview(**payload)


def build_request(**overrides) -> PlanReviewRequest:
    payload = {
        "review_id": "wave4-review",
        "expected_bead_ids": ("B-029", "B-030"),
        "known_bead_ids": ("B-001", "B-029", "B-030", "B-044", "B-050", "B-051", "B-052", "B-053"),
        "bead_reviews": (
            build_review("B-029", dependency_ids=("B-001", "B-052", "B-053")),
            build_review("B-030", dependency_ids=("B-001", "B-029")),
        ),
    }
    payload.update(overrides)
    return PlanReviewRequest(**payload)


def test_gate_passes_with_complete_scope_dependency_and_traceability_package():
    outcome = PlanAdversarialReviewGate().review(build_request())

    assert outcome.passed is True
    assert outcome.blocking_reason_codes == ()
    assert outcome.missing_bead_ids == ()
    assert outcome.unknown_dependency_ids == ()
    assert outcome.traceability_gaps == {}
    assert [item.check for item in outcome.checklist] == [
        PlanReviewCheck.SCOPE_ALIGNMENT,
        PlanReviewCheck.DEPENDENCY_INTEGRITY,
        PlanReviewCheck.TEST_COVERAGE,
        PlanReviewCheck.TRACEABILITY_MATRIX,
        PlanReviewCheck.BLOCKER_CLASSIFICATION,
    ]


def test_gate_fails_when_expected_bead_review_is_missing():
    outcome = PlanAdversarialReviewGate().review(
        build_request(bead_reviews=(build_review("B-029"),))
    )

    assert outcome.passed is False
    assert outcome.missing_bead_ids == ("B-030",)
    assert "missing_bead_review" in outcome.blocking_reason_codes


def test_gate_fails_when_dependency_or_traceability_is_incomplete():
    outcome = PlanAdversarialReviewGate().review(
        build_request(
            bead_reviews=(
                build_review("B-029", dependency_ids=("B-999",), risk_controls=()),
                build_review("B-030"),
            )
        )
    )

    assert outcome.passed is False
    assert outcome.unknown_dependency_ids == ("B-999",)
    assert outcome.traceability_gaps["B-029"] == ("risk_controls",)
    assert "unknown_dependency_detected" in outcome.blocking_reason_codes
    assert "traceability_gap_detected" in outcome.blocking_reason_codes


def test_gate_fails_when_test_obligations_are_missing():
    outcome = PlanAdversarialReviewGate().review(
        build_request(
            bead_reviews=(
                build_review("B-029", unit_test_obligations=()),
                build_review("B-030"),
            )
        )
    )

    assert outcome.passed is False
    assert "test_obligations_incomplete" in outcome.blocking_reason_codes


def test_request_rejects_self_dependency():
    with pytest.raises(PlanAdversarialReviewError, match="cannot depend on itself"):
        build_review("B-029", dependency_ids=("B-029",))
