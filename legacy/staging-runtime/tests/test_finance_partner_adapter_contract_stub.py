"""Executable validation stub for B-020 finance partner adapter contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b020_finance_partner_adapter_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_partner_boundary_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-020"
    assert contract["tool_name"] == "finance.partner_decision.submit"
    assert {"responsibility_boundary", "idempotency", "partner_policy"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_journey_and_data_check_obligations():
    contract = _load_contract()

    assert {"request_id", "idempotency_key", "policy_context"} <= set(
        contract["input"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "CJ-004"
    assert contract["test_obligations"]["data_check"] == "DI-003"
