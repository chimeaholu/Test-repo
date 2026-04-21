"""Command envelope adapter backed by canonical package contracts artifacts."""

from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError as JsonSchemaValidationError
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.contracts_catalog import (
    get_contract_descriptor,
    get_envelope_schema_version,
    load_contract_schema,
)

REQUEST_CONTRACT_ID = "envelope.request"
DEFAULT_JOURNEY_ID = "EP-005"


@lru_cache(maxsize=1)
def _request_envelope_validator() -> Draft202012Validator:
    schema = _normalize_nullable_schema(load_contract_schema(REQUEST_CONTRACT_ID))
    return Draft202012Validator(schema)


@lru_cache(maxsize=8)
def _validator_for_contract(contract_id: str) -> Draft202012Validator:
    schema = _normalize_nullable_schema(load_contract_schema(contract_id))
    return Draft202012Validator(schema)


def _normalize_nullable_schema(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_nullable_schema(item) for item in value]
    if isinstance(value, dict):
        normalized = {
            key: _normalize_nullable_schema(nested)
            for key, nested in value.items()
            if key != "nullable"
        }
        if value.get("nullable") is True:
            return {"anyOf": [normalized, {"type": "null"}]}
        return normalized
    return value


def _normalize_for_contract(value: dict[str, Any]) -> dict[str, Any]:
    if "command_name" in value and "command" not in value:
        metadata = dict(value.get("metadata", {}))
        request_id = str(metadata.get("request_id", ""))
        metadata.setdefault("correlation_id", request_id)
        metadata.setdefault("occurred_at", datetime.now(tz=UTC).isoformat())
        metadata.setdefault("traceability", {"journey_ids": [DEFAULT_JOURNEY_ID]})
        metadata["country_code"] = str(metadata.get("country_code", "")).upper()

        return {
            "metadata": metadata,
            "command": {
                "name": value["command_name"],
                "aggregate_ref": value.get("aggregate_ref", "workflow_execution"),
                "mutation_scope": value.get("mutation_scope", "regulated"),
                "payload": value.get("payload", {}),
            },
        }
    return value


class CommandTraceability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    journey_ids: list[str] = Field(min_length=1)
    data_check_ids: list[str] = Field(default_factory=list)


class CommandMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = Field(default_factory=get_envelope_schema_version)
    request_id: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1, max_length=128)
    actor_id: str = Field(min_length=3, max_length=64)
    country_code: str = Field(min_length=2, max_length=2, pattern="^[A-Z]{2}$")
    channel: str = Field(min_length=2, max_length=32)
    correlation_id: str = Field(min_length=1)
    causation_id: str | None = None
    occurred_at: datetime
    traceability: CommandTraceability


class CommandDescriptor(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=128)
    aggregate_ref: str = Field(min_length=1, max_length=128)
    mutation_scope: str = Field(min_length=1, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)


class CommandEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metadata: CommandMetadata
    command: CommandDescriptor

    @model_validator(mode="before")
    @classmethod
    def _coerce_legacy_payload(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return _normalize_for_contract(value)
        return value

    @model_validator(mode="after")
    def _validate_against_contract_package(self) -> "CommandEnvelope":
        validator = _request_envelope_validator()
        descriptor = get_contract_descriptor(REQUEST_CONTRACT_ID)
        payload = self.model_dump(mode="json", exclude_none=True)
        try:
            validator.validate(payload)
        except JsonSchemaValidationError as exc:
            raise ValueError(
                f"{descriptor.name} validation failed: {exc.message}"
            ) from exc
        return self

    @property
    def command_name(self) -> str:
        return self.command.name

    @property
    def payload(self) -> dict[str, Any]:
        return self.command.payload


class CommandResultEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    request_id: str
    idempotency_key: str
    result: dict[str, Any]
    error_code: str | None = None
    audit_event_id: int
    replayed: bool = False


def validate_contract_payload(contract_id: str, payload: dict[str, Any]) -> None:
    validator = _validator_for_contract(contract_id)
    descriptor = get_contract_descriptor(contract_id)
    try:
        validator.validate(payload)
    except JsonSchemaValidationError as exc:
        raise ValueError(f"{descriptor.name} validation failed: {exc.message}") from exc
