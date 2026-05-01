"""Executable validation stub for B-047 telemetry ingestion API contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b047_telemetry_ingestion_api_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_idempotent_resumable_versioned_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-047"
    assert "telemetry-ingest.v1" in contract["api_versions"]
    assert {"idempotency", "resume_tokens", "versioning"} <= set(contract["scope"]["focus"])


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    required = set(contract["input"]["required_fields"])
    assert {"session_id", "batch_index", "idempotency_key", "event_ids"} <= required
    assert contract["test_obligations"]["journey"] == "IOTJ-003"
    assert contract["test_obligations"]["data_check"] == "IOTDI-003"
