"""Executable validation stub for B-022 finance HITL approval console contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b022_finance_hitl_console_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_operator_review_queue_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-022"
    assert {"operator_review_queue", "approval_state_machine", "ux_state_coverage"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"item_id", "source_reference_id", "country_code"} <= set(
        contract["queue_item"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "CJ-008"
    assert contract["test_obligations"]["data_check"] == "DI-003"
