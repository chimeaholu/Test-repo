"""B-039 mobile API profile and payload budget primitives."""

from __future__ import annotations

import json
from dataclasses import dataclass

from .tool_contracts import ToolContractError, ToolContractRegistry


class MobileApiProfileError(ValueError):
    """Raised when mobile profile negotiation or validation fails."""


@dataclass(frozen=True)
class PayloadBudget:
    endpoint_name: str
    max_bytes: int
    max_items: int | None = None

    def __post_init__(self) -> None:
        if not self.endpoint_name.strip():
            raise MobileApiProfileError("endpoint_name is required")
        if self.max_bytes <= 0:
            raise MobileApiProfileError("max_bytes must be greater than zero")
        if self.max_items is not None and self.max_items <= 0:
            raise MobileApiProfileError("max_items must be greater than zero")


@dataclass(frozen=True)
class PaginationPolicy:
    default_page_size: int
    max_page_size: int
    cursor_parameter: str = "cursor"

    def __post_init__(self) -> None:
        if self.default_page_size <= 0:
            raise MobileApiProfileError("default_page_size must be greater than zero")
        if self.max_page_size < self.default_page_size:
            raise MobileApiProfileError("max_page_size must be >= default_page_size")
        if not self.cursor_parameter.strip():
            raise MobileApiProfileError("cursor_parameter is required")


@dataclass(frozen=True)
class ResumableOperation:
    operation_name: str
    token_ttl_seconds: int
    contract_tool_name: str | None = None

    def __post_init__(self) -> None:
        if not self.operation_name.strip():
            raise MobileApiProfileError("operation_name is required")
        if self.token_ttl_seconds <= 0:
            raise MobileApiProfileError("token_ttl_seconds must be greater than zero")


@dataclass(frozen=True)
class MobileApiProfile:
    version: str
    payload_budgets: tuple[PayloadBudget, ...]
    pagination: PaginationPolicy
    resumable_operations: tuple[ResumableOperation, ...]

    def __post_init__(self) -> None:
        if not self.version.strip():
            raise MobileApiProfileError("version is required")


@dataclass(frozen=True)
class PayloadBudgetResult:
    endpoint_name: str
    size_bytes: int
    within_budget: bool


class MobileApiProfileRegistry:
    """Registers versioned mobile profiles and validates Android-facing constraints."""

    def __init__(self) -> None:
        self._profiles: dict[str, MobileApiProfile] = {}

    def register(self, profile: MobileApiProfile) -> None:
        if profile.version in self._profiles:
            raise MobileApiProfileError("profile version already registered")
        self._profiles[profile.version] = profile

    def get(self, version: str) -> MobileApiProfile:
        try:
            return self._profiles[version]
        except KeyError as exc:
            raise MobileApiProfileError("profile version not registered") from exc

    def negotiate_version(
        self,
        *,
        accepted_versions: tuple[str, ...],
        minimum_version: str | None = None,
    ) -> MobileApiProfile:
        if not accepted_versions:
            raise MobileApiProfileError("accepted_versions must not be empty")

        minimum = (minimum_version or "").strip()
        compatible = sorted(
            set(accepted_versions).intersection(self._profiles),
            reverse=True,
        )
        if minimum:
            compatible = [version for version in compatible if version >= minimum]
        if not compatible:
            raise MobileApiProfileError("no compatible mobile profile version")
        return self._profiles[compatible[0]]

    def assert_payload_budget(
        self,
        *,
        version: str,
        endpoint_name: str,
        payload: object,
    ) -> PayloadBudgetResult:
        profile = self.get(version)
        budget = _find_budget(profile, endpoint_name)
        encoded = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        size_bytes = len(encoded)
        if size_bytes > budget.max_bytes:
            raise MobileApiProfileError(
                f"payload budget exceeded for {endpoint_name}: {size_bytes} > {budget.max_bytes}"
            )
        if budget.max_items is not None and isinstance(payload, list) and len(payload) > budget.max_items:
            raise MobileApiProfileError(
                f"payload item budget exceeded for {endpoint_name}: {len(payload)} > {budget.max_items}"
            )
        return PayloadBudgetResult(
            endpoint_name=endpoint_name,
            size_bytes=size_bytes,
            within_budget=True,
        )

    def build_page_request(
        self,
        *,
        version: str,
        page_size: int | None = None,
        cursor: str | None = None,
    ) -> dict[str, object]:
        profile = self.get(version)
        resolved_page_size = page_size or profile.pagination.default_page_size
        if resolved_page_size <= 0:
            raise MobileApiProfileError("page_size must be greater than zero")
        if resolved_page_size > profile.pagination.max_page_size:
            raise MobileApiProfileError("page_size exceeds mobile profile max_page_size")
        request = {"page_size": resolved_page_size}
        if cursor:
            request[profile.pagination.cursor_parameter] = cursor
        return request

    def validate_resumable_mutation(
        self,
        *,
        version: str,
        operation_name: str,
        payload: dict[str, object],
        operation_token: str,
        contract_version: str,
        contract_registry: ToolContractRegistry | None = None,
    ) -> None:
        profile = self.get(version)
        operation = _find_operation(profile, operation_name)
        if not operation_token.strip():
            raise MobileApiProfileError("operation_token is required")
        if contract_registry and operation.contract_tool_name:
            try:
                contract_registry.validate_input(
                    tool_name=operation.contract_tool_name,
                    version=contract_version,
                    payload=payload,
                )
            except ToolContractError as exc:
                raise MobileApiProfileError(str(exc)) from exc


def _find_budget(profile: MobileApiProfile, endpoint_name: str) -> PayloadBudget:
    for budget in profile.payload_budgets:
        if budget.endpoint_name == endpoint_name:
            return budget
    raise MobileApiProfileError(f"no payload budget registered for endpoint: {endpoint_name}")


def _find_operation(profile: MobileApiProfile, operation_name: str) -> ResumableOperation:
    for operation in profile.resumable_operations:
        if operation.operation_name == operation_name:
            return operation
    raise MobileApiProfileError(f"operation is not resumable in profile: {operation_name}")
