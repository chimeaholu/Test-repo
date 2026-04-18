"""Executable validation stub for B-045 device registry contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b045_device_registry_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_identity_surface_and_lifecycle_states():
    contract = _load_contract()

    assert contract["bead_id"] == "B-045"
    assert {"hardware_serial", "hardware_fingerprint", "firmware_version"} <= set(
        contract["identity_fields"]
    )
    assert contract["lifecycle_states"] == [
        "provisioned",
        "active",
        "suspended",
        "retired",
    ]


def test_contract_declares_persisted_lineage_and_test_obligations():
    contract = _load_contract()

    assert {"device_id", "lineage_root_id", "status_history"} <= set(contract["persisted_fields"])
    assert contract["test_obligations"]["journey"] == "IOTJ-001"
    assert contract["test_obligations"]["data_check"] == "IOTDI-001"
