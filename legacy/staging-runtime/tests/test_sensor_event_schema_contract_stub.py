"""Executable validation stub for B-046 sensor event schema contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b046_sensor_event_schema_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_event_versioning_and_required_provenance_fields():
    contract = _load_contract()

    assert contract["bead_id"] == "B-046"
    assert "sensor-event.v1" in contract["schema_versions"]
    assert {"source_provider", "signature", "confidence", "trace_id"} <= set(
        contract["provenance_fields"]
    )


def test_contract_declares_registry_binding_and_test_obligations():
    contract = _load_contract()

    assert {"device_id", "lineage_root_id", "registry_version"} <= set(
        contract["registry_binding_fields"]
    )
    assert contract["test_obligations"]["journey"] == "IOTJ-002"
    assert contract["test_obligations"]["data_check"] == "IOTDI-002"
