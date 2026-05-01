"""Executable validation stub for B-027 observability contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b027_observability_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_traces_metrics_and_alerting_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-027"
    assert {"traces", "metrics", "country_channel_slo_alerting"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"metric_id", "channel", "country_code", "operation"} <= set(
        contract["telemetry"]["required_fields"]
    )
    assert {"PF-001", "PF-004"} <= set(contract["test_obligations"]["journeys"])
    assert contract["test_obligations"]["data_check"] == "DI-002"
