from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException


@dataclass(frozen=True)
class ContractDescriptor:
    contract_id: str
    name: str
    schema_version: str
    schema_path: Path


def get_contract_headers(contract_id: str) -> dict[str, str]:
    descriptor = get_contract_descriptor(contract_id)
    return {
        "X-Agrodomain-Contract-Id": descriptor.contract_id,
        "X-Agrodomain-Contract-Name": descriptor.name,
        "X-Agrodomain-Schema-Version": descriptor.schema_version,
    }


@lru_cache(maxsize=1)
def _contracts_root() -> Path:
    agrodomain_root = Path(__file__).resolve().parents[4]
    return agrodomain_root / "packages" / "contracts"


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    manifest_path = _contracts_root() / "generated" / "manifest.json"
    with manifest_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=32)
def get_contract_descriptor(contract_id: str) -> ContractDescriptor:
    manifest = load_manifest()
    for contract in manifest.get("contracts", []):
        if contract.get("id") == contract_id:
            schema_relative_path = contract["schema_path"]
            schema_path = _contracts_root() / schema_relative_path
            return ContractDescriptor(
                contract_id=contract["id"],
                name=contract["name"],
                schema_version=contract["schema_version"],
                schema_path=schema_path,
            )
    raise ValueError(f"Contract descriptor not found for id={contract_id}")


@lru_cache(maxsize=32)
def load_contract_schema(contract_id: str) -> dict[str, Any]:
    descriptor = get_contract_descriptor(contract_id)
    with descriptor.schema_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def get_envelope_schema_version() -> str:
    descriptor = get_contract_descriptor("envelope.request")
    return descriptor.schema_version


def validate_contract_payload(
    contract_id: str,
    payload: dict[str, Any],
    *,
    require_schema_version: bool = True,
) -> dict[str, Any]:
    schema = load_contract_schema(contract_id)
    descriptor = get_contract_descriptor(contract_id)
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail={"error_code": "invalid_contract_payload"})

    target_schema = schema
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/definitions/"):
        definition_key = ref.removeprefix("#/definitions/")
        target_schema = schema.get("definitions", {}).get(definition_key, schema)

    properties = target_schema.get("properties", {})
    required = set(target_schema.get("required", []))
    unknown_fields = sorted(set(payload) - set(properties))
    if unknown_fields:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "unknown_contract_fields",
                "contract_id": contract_id,
                "fields": unknown_fields,
            },
        )

    missing_fields = sorted(field for field in required if field not in payload)
    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "missing_contract_fields",
                "contract_id": contract_id,
                "fields": missing_fields,
            },
        )

    if require_schema_version:
        schema_version = payload.get("schema_version")
        if schema_version != descriptor.schema_version:
            raise HTTPException(
                status_code=422,
                detail={
                    "error_code": "invalid_schema_version",
                    "contract_id": contract_id,
                    "expected": descriptor.schema_version,
                    "received": schema_version,
                },
            )

    return payload
