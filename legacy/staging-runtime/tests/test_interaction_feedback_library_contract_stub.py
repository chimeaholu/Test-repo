"""Executable validation stub for B-051 interaction feedback library contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b051_interaction_feedback_library_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_feedback_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-051"
    assert {"loading", "error", "offline", "retry", "trust"} <= set(
        contract["scope"]["states"]
    )


def test_contract_declares_critical_flow_coverage():
    contract = _load_contract()

    assert {
        "listing_create",
        "negotiation_reply",
        "settlement_status",
        "advisory_request",
        "offline_sync",
    } <= set(contract["critical_flows"])
    assert contract["test_obligations"]["journeys"] == ["UXJ-002", "UXJ-004"]
    assert contract["test_obligations"]["data_check"] == "UXDI-002"
