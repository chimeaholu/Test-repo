"""B-035 versioned tool contract registry with strict schema validation."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ContractValueType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class ToolContractError(ValueError):
    """Raised when a tool contract definition or validation request is invalid."""


@dataclass(frozen=True)
class ContractField:
    name: str
    value_type: ContractValueType
    required: bool = True
    allow_none: bool = False

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ToolContractError("field name is required")


@dataclass(frozen=True)
class ToolContract:
    tool_name: str
    version: str
    input_fields: tuple[ContractField, ...]
    output_fields: tuple[ContractField, ...]

    def __post_init__(self) -> None:
        if not self.tool_name.strip():
            raise ToolContractError("tool_name is required")
        if not self.version.strip():
            raise ToolContractError("version is required")
        self._assert_unique_fields(self.input_fields, "input_fields")
        self._assert_unique_fields(self.output_fields, "output_fields")

    @staticmethod
    def _assert_unique_fields(fields: tuple[ContractField, ...], label: str) -> None:
        names = [field.name for field in fields]
        if len(names) != len(set(names)):
            raise ToolContractError(f"{label} contains duplicate field names")


class ToolContractRegistry:
    """Registers versioned tool contracts and enforces strict payload schemas."""

    def __init__(self) -> None:
        self._contracts: dict[tuple[str, str], ToolContract] = {}

    def register(self, contract: ToolContract) -> None:
        key = (contract.tool_name, contract.version)
        if key in self._contracts:
            raise ToolContractError("contract version already registered")
        self._contracts[key] = contract

    def get(self, tool_name: str, version: str) -> ToolContract:
        try:
            return self._contracts[(tool_name, version)]
        except KeyError as exc:
            raise ToolContractError("contract not registered") from exc

    def validate_input(self, *, tool_name: str, version: str, payload: dict[str, object]) -> None:
        contract = self.get(tool_name, version)
        self._validate_payload(payload=payload, fields=contract.input_fields, label="input")

    def validate_output(self, *, tool_name: str, version: str, payload: dict[str, object]) -> None:
        contract = self.get(tool_name, version)
        self._validate_payload(payload=payload, fields=contract.output_fields, label="output")

    def _validate_payload(
        self,
        *,
        payload: dict[str, object],
        fields: tuple[ContractField, ...],
        label: str,
    ) -> None:
        allowed_names = {field.name for field in fields}
        payload_names = set(payload)
        extra_names = sorted(payload_names.difference(allowed_names))
        if extra_names:
            raise ToolContractError(
                f"{label} payload contains unknown fields: {', '.join(extra_names)}"
            )

        for field in fields:
            if field.name not in payload:
                if field.required:
                    raise ToolContractError(f"{label} payload missing required field: {field.name}")
                continue

            value = payload[field.name]
            if value is None:
                if field.allow_none:
                    continue
                raise ToolContractError(f"{label} field '{field.name}' does not allow null")

            if not _matches_type(value=value, expected=field.value_type):
                raise ToolContractError(
                    f"{label} field '{field.name}' expected {field.value_type.value}"
                )


def _matches_type(*, value: object, expected: ContractValueType) -> bool:
    if expected == ContractValueType.STRING:
        return isinstance(value, str)
    if expected == ContractValueType.INTEGER:
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == ContractValueType.NUMBER:
        return (isinstance(value, int) and not isinstance(value, bool)) or isinstance(value, float)
    if expected == ContractValueType.BOOLEAN:
        return isinstance(value, bool)
    if expected == ContractValueType.OBJECT:
        return isinstance(value, dict)
    if expected == ContractValueType.ARRAY:
        return isinstance(value, list)
    return False
