"""Executable validation stub for B-044 Android performance harness contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b044_android_performance_harness_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_android_matrix_coverage():
    contract = _load_contract()

    assert contract["bead_id"] == "B-044"
    assert contract["scope"]["matrix_ids"] == [
        "ARM-001",
        "ARM-002",
        "ARM-003",
        "ARM-004",
    ]


def test_contract_declares_full_journey_and_data_check_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journeys"] == [
        "ARJ-001",
        "ARJ-002",
        "ARJ-003",
        "ARJ-004",
        "ARJ-005",
        "ARJ-006",
    ]
    assert contract["test_obligations"]["data_checks"] == [
        "ARDI-001",
        "ARDI-002",
        "ARDI-003",
        "ARDI-004",
        "ARDI-005",
    ]


def test_contract_declares_low_end_budget_targets():
    contract = _load_contract()

    arm001 = contract["fixtures"]["ARM-001"]
    arm004 = contract["fixtures"]["ARM-004"]

    assert arm001["network_profile"] == "unstable_3g"
    assert arm001["budget"]["min_replay_success_rate"] == 0.99
    assert arm001["budget"]["max_duplicate_commits"] == 0
    assert arm004["network_profile"] == "signal_transitions"
    assert arm004["budget"]["max_conflict_resolution_ms"] == 1800
