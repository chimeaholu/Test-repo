"""Executable validation stub for B-054 UX excellence review contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b054_ux_excellence_review_gate_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_phase_specific_checklists():
    contract = _load_contract()

    assert contract["bead_id"] == "B-054"
    assert contract["gate"]["pre_build_checklist"] == [
        "visual_language",
        "interaction_patterns",
        "accessibility_baseline",
        "trust_pattern_checklist",
    ]
    assert contract["gate"]["pre_release_checklist"] == [
        "usability_heuristics",
        "conversion_metrics",
        "low_end_android",
        "generic_pattern_audit",
    ]


def test_contract_declares_blocking_generic_findings_and_required_metrics():
    contract = _load_contract()

    assert contract["generic_fail_findings"] == [
        "template_like_layout",
        "generic_placeholder_copy",
        "missing_trust_cues",
    ]
    assert contract["required_conversion_metrics"] == [
        "onboarding_completion",
        "offer_to_settlement_completion",
        "advisory_follow_through",
        "dispute_resolution_completion",
    ]


def test_contract_declares_b054_dependencies_and_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == ["B-050", "B-051", "B-052", "B-053"]
    assert contract["test_obligations"]["unit"] == "checklist completeness and blocker classification checks"
    assert contract["test_obligations"]["journey"] == "UXG-001"
    assert contract["test_obligations"]["data_check"] == "UXDI-005"
