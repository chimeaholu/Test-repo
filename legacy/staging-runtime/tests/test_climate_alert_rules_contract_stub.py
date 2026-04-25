"""Executable validation stub for B-018 climate alert rules contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b018_climate_alert_rules_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_threshold_and_precedence_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-018"
    assert {"thresholds", "precedence", "farm_context"} <= set(contract["scope"]["focus"])


def test_contract_declares_supported_metrics_and_severity_model():
    contract = _load_contract()

    assert {
        "rainfall_24h_mm",
        "temperature_max_c",
        "ndvi_ratio",
        "soil_moisture_ratio",
    } <= set(contract["supported_metrics"])
    assert contract["severity_order"] == ["critical", "warning", "watch"]


def test_contract_declares_climate_test_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journey"] == "CJ-006"
    assert contract["test_obligations"]["data_check"] == "DI-006"
    assert {"threshold_value", "provenance_key"} <= set(contract["state_payload_fields"])
