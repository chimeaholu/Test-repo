"""Executable validation stub for B-053 low-end Android mobile UX contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b053_android_mobile_ux_harness_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_android_matrix_and_scenario_coverage():
    contract = _load_contract()

    assert contract["bead_id"] == "B-053"
    assert contract["scope"]["matrix_ids"] == [
        "ARM-001",
        "ARM-002",
        "ARM-003",
        "ARM-004",
    ]
    assert contract["scope"]["scenario_ids"] == [
        "UXA-001",
        "UXA-002",
        "UXA-003",
        "UXA-004",
    ]


def test_contract_declares_polish_thresholds():
    contract = _load_contract()

    assert contract["thresholds"]["max_primary_action_words"] == 2
    assert contract["thresholds"]["max_step_count"] == 4
    assert contract["thresholds"]["min_trust_marker_count"] == 2
    assert contract["thresholds"]["require_offline_handoff_states"] == [
        "offline",
        "retry",
    ]


def test_contract_declares_b053_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == ["B-051", "B-044"]
    assert contract["test_obligations"]["journey"] == "UXJ-005"
    assert contract["test_obligations"]["ux_quality"] == "UXJ-002 + UXDI-002"
    assert contract["test_obligations"]["data_check"] == "UXDI-004"
