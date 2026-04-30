from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ContractDescriptor:
    contract_id: str
    name: str
    schema_version: str
    schema_path: Path


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
