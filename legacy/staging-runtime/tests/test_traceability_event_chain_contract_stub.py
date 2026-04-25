"""Executable validation stub for B-023 traceability event chain contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b023_traceability_event_chain_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_chain_continuity_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-023"
    assert {"consignment_lifecycle", "hash_chain_continuity", "custody_events"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"consignment_id", "listing_id", "event_type"} <= set(
        contract["event"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "CJ-007"
    assert contract["test_obligations"]["data_check"] == "DI-006"
