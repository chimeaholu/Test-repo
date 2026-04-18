"""Executable validation stub for B-028 multi-channel QA harness contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b028_multi_channel_qa_harness_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_fixture_and_stub_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-028"
    assert {"fixtures", "channel_stubs", "suite_execution"} <= set(contract["scope"]["focus"])


def test_contract_declares_full_journey_and_data_check_matrix():
    contract = _load_contract()

    assert contract["test_obligations"]["journeys"] == {
        "core": ["CJ-001", "CJ-002", "CJ-003", "CJ-004", "CJ-005", "CJ-006", "CJ-007", "CJ-008"],
        "enterprise": ["EP-001", "EP-002", "EP-003", "EP-004", "EP-005", "EP-006", "EP-007", "EP-008"]
    }
    assert contract["test_obligations"]["data_checks"] == [
        "DI-001",
        "DI-002",
        "DI-003",
        "DI-004",
        "DI-005",
        "DI-006"
    ]
