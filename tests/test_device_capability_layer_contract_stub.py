"""Executable validation stub for B-042 device capability abstraction contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b042_device_capability_layer_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_capability_surface_and_domain_isolation():
    contract = _load_contract()

    assert contract["bead_id"] == "B-042"
    assert {"camera", "location", "storage", "background_job"} <= set(contract["capabilities"])
    assert contract["domain_logic_coupling"] == "prohibited"


def test_contract_declares_traceability_and_execution_modes():
    contract = _load_contract()

    assert {"direct", "degraded", "deferred", "blocked"} <= set(contract["execution_modes"])
    assert {"trace_id", "domain_action", "capability_path"} <= set(contract["telemetry_fields"])


def test_contract_declares_android_test_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journey"] == "ARJ-006"
    assert contract["test_obligations"]["data_check"] == "ARDI-004"
    assert "UXDI-002" in contract["test_obligations"]["ux_quality"]
