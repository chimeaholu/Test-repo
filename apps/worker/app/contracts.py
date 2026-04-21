from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


@lru_cache(maxsize=1)
def _contracts_root() -> Path:
    return Path(__file__).resolve().parents[3] / "packages" / "contracts"


@lru_cache(maxsize=1)
def _manifest() -> dict[str, Any]:
    with (_contracts_root() / "generated" / "manifest.json").open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=32)
def _schema_for_contract(contract_id: str) -> tuple[str, dict[str, Any]]:
    for descriptor in _manifest().get("contracts", []):
        if descriptor.get("id") == contract_id:
            schema_path = _contracts_root() / descriptor["schema_path"]
            with schema_path.open("r", encoding="utf-8") as handle:
                return descriptor["schema_version"], json.load(handle)
    raise ValueError(f"Unknown contract id {contract_id}")


def validate_contract_payload(contract_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    schema_version, schema = _schema_for_contract(contract_id)
    if payload.get("schema_version") != schema_version:
        raise ValueError(f"Invalid schema version for {contract_id}")
    target_schema = schema
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/definitions/"):
        definition_key = ref.removeprefix("#/definitions/")
        target_schema = schema.get("definitions", {}).get(definition_key, schema)
    properties = set(target_schema.get("properties", {}))
    required = set(target_schema.get("required", []))
    unknown_fields = sorted(set(payload) - properties)
    if unknown_fields:
        raise ValueError(f"Unknown fields for {contract_id}: {unknown_fields}")
    missing_fields = sorted(field for field in required if field not in payload)
    if missing_fields:
        raise ValueError(f"Missing fields for {contract_id}: {missing_fields}")
    return payload
