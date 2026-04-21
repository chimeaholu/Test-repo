"""Executable validation stub for B-025 enterprise analytics mart contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b025_enterprise_analytics_mart_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_anonymized_mart_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-025"
    assert {"anonymized_regional_intelligence", "metrics_schema_projection"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"anonymized_subject_key", "region", "metric_value"} <= set(
        contract["mart_row"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "CJ-008"
    assert contract["test_obligations"]["data_check"] == "DI-003"
