"""Executable validation stub for B-049 digital twin governance contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b049_digital_twin_governance_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_twin_compatibility_and_governance_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-049"
    assert {
        "digital_twin_field_compatibility",
        "sensor_origin_governance_tags",
        "no_hardware_now_guardrails",
    } <= set(contract["scope"]["focus"])


def test_contract_declares_required_projection_fields_and_obligations():
    contract = _load_contract()

    assert {"farm_node_id", "sensor_state_refs", "governance_boundary"} <= set(
        contract["twin_projection"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "IOTJ-005"
    assert contract["test_obligations"]["data_check"] == "IOTDI-005"
