"""Executable validation stub for B-052 accessibility/readability contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b052_accessibility_readability_pack_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_low_literacy_mobile_standards():
    contract = _load_contract()

    assert contract["bead_id"] == "B-052"
    assert contract["scope"]["standards"] == [
        "low_literacy_copy",
        "contrast_guardrails",
        "tap_target_minimums",
        "screen_reader_labels",
        "voice_hints_for_recovery",
    ]


def test_contract_declares_component_rules_and_validation_coverage():
    contract = _load_contract()

    assert contract["components"] == ["body_card", "primary_button"]
    assert contract["validation_workflow"]["required_coverage"] == "all CriticalFlow x InteractionState pairs"
    assert contract["validation_workflow"]["required_fields"] == [
        "reviewed_items",
        "missing_pairs",
        "failing_pairs",
        "covered_flows",
    ]


def test_contract_declares_b052_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == ["B-050", "B-051"]
    assert contract["test_obligations"]["journey"] == "UXJ-003"
    assert contract["test_obligations"]["ux_quality"] == "UXJ-002 + UXDI-002"
    assert contract["test_obligations"]["data_check"] == "UXDI-003"
