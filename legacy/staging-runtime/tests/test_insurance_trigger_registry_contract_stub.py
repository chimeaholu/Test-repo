"""Executable validation stub for B-021 insurance trigger registry contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b021_insurance_trigger_registry_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_trigger_threshold_source_and_payout_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-021"
    assert {"thresholds", "source_references", "payout_events"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"trigger_id", "partner_id", "product_code"} <= set(
        contract["definition"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "EP-008"
    assert contract["test_obligations"]["data_check"] == "DI-006"
