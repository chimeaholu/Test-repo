"""Executable validation stub for B-004 USSD adapter contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b004_ussd_adapter_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_compact_menu_and_timeout_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-004"
    assert {"compact_menu_flows", "session_serialization", "timeout_recovery"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_journeys_and_ux_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journeys"] == ["CJ-001", "EP-002"]
    assert contract["test_obligations"]["ux_quality"] == "UXJ-002 + UXDI-002"
    assert contract["test_obligations"]["data_check"] == "DI-001"
