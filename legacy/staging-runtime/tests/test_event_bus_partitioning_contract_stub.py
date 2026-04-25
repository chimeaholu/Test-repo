"""Executable validation stub for B-048 event bus partitioning contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b048_event_bus_partitioning_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_topic_taxonomy_and_partition_focus():
    contract = _load_contract()

    assert contract["bead_id"] == "B-048"
    assert {"topic_taxonomy", "farm_partitioning", "region_partitioning"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_route_fields_and_obligations():
    contract = _load_contract()

    assert {"session_id", "batch_index", "event_id", "country_code"} <= set(
        contract["input"]["required_fields"]
    )
    assert {"topic_name", "partition_key", "ordering_key"} <= set(
        contract["output"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "IOTJ-004"
    assert contract["test_obligations"]["data_check"] == "IOTDI-004"
