"""F-022 typed DTO adapters and validation helpers for frontend transport seams."""

from __future__ import annotations

from dataclasses import asdict, dataclass, is_dataclass
import json
from typing import Any


class FrontendContractAdapterError(ValueError):
    """Raised when frontend DTO envelopes or mutations are malformed."""


@dataclass(frozen=True)
class FrontendDtoIssue:
    path: str
    reason_code: str


@dataclass(frozen=True)
class FrontendRouteDtoEnvelope:
    route_name: str
    schema_version: str
    role: str
    source_bead_ids: tuple[str, ...]
    payload: dict[str, object]
    payload_bytes: int


@dataclass(frozen=True)
class FrontendMutationDto:
    action: str
    route_name: str
    schema_version: str
    idempotency_key: str
    payload: dict[str, object]
    offline_capable: bool
    invalidates_routes: tuple[str, ...]


@dataclass(frozen=True)
class FrontendContractValidationReport:
    passed: bool
    issues: tuple[FrontendDtoIssue, ...]
    payload_bytes: int


class FrontendContractAdapters:
    """Builds typed transport envelopes for frontend routes and mutation services."""

    def adapt_payload(
        self,
        *,
        route_name: str,
        role: str,
        source_bead_ids: tuple[str, ...],
        payload: object,
        schema_version: str = "frontend.dto.v1",
    ) -> FrontendRouteDtoEnvelope:
        normalized = _normalize_value(payload, path="payload")
        if not isinstance(normalized, dict):
            raise FrontendContractAdapterError("payload must normalize into an object")
        payload_bytes = _payload_bytes(normalized)
        envelope = FrontendRouteDtoEnvelope(
            route_name=route_name,
            schema_version=schema_version,
            role=role,
            source_bead_ids=source_bead_ids,
            payload=normalized,
            payload_bytes=payload_bytes,
        )
        report = self.validate_envelope(envelope)
        if not report.passed:
            first_issue = report.issues[0]
            raise FrontendContractAdapterError(
                f"invalid route envelope at {first_issue.path}: {first_issue.reason_code}"
            )
        return envelope

    def build_mutation(
        self,
        *,
        action: str,
        route_name: str,
        payload: object,
        idempotency_key: str,
        invalidates_routes: tuple[str, ...] = (),
        offline_capable: bool = True,
        schema_version: str = "frontend.mutation.v1",
    ) -> FrontendMutationDto:
        normalized = _normalize_value(payload, path="payload")
        if not isinstance(normalized, dict):
            raise FrontendContractAdapterError("mutation payload must normalize into an object")
        mutation = FrontendMutationDto(
            action=action,
            route_name=route_name,
            schema_version=schema_version,
            idempotency_key=idempotency_key,
            payload=normalized,
            offline_capable=offline_capable,
            invalidates_routes=invalidates_routes,
        )
        report = self.validate_mutation(mutation)
        if not report.passed:
            first_issue = report.issues[0]
            raise FrontendContractAdapterError(
                f"invalid mutation at {first_issue.path}: {first_issue.reason_code}"
            )
        return mutation

    def validate_envelope(
        self,
        envelope: FrontendRouteDtoEnvelope,
    ) -> FrontendContractValidationReport:
        issues: list[FrontendDtoIssue] = []
        if not envelope.route_name.startswith("/app/"):
            issues.append(FrontendDtoIssue("route_name", "route_must_live_under_app"))
        if not envelope.schema_version.strip():
            issues.append(FrontendDtoIssue("schema_version", "schema_version_required"))
        if not str(envelope.role).strip():
            issues.append(FrontendDtoIssue("role", "role_required"))
        if not envelope.source_bead_ids:
            issues.append(FrontendDtoIssue("source_bead_ids", "source_bead_ids_required"))
        for index, bead_id in enumerate(envelope.source_bead_ids):
            if not bead_id.strip():
                issues.append(FrontendDtoIssue(f"source_bead_ids[{index}]", "bead_id_required"))
        issues.extend(_validate_object(envelope.payload, path="payload", allow_nulls=True))
        return FrontendContractValidationReport(
            passed=not issues,
            issues=tuple(issues),
            payload_bytes=envelope.payload_bytes,
        )

    def validate_mutation(
        self,
        mutation: FrontendMutationDto,
    ) -> FrontendContractValidationReport:
        issues: list[FrontendDtoIssue] = []
        if not mutation.action.strip():
            issues.append(FrontendDtoIssue("action", "action_required"))
        if not mutation.route_name.startswith("/app/"):
            issues.append(FrontendDtoIssue("route_name", "route_must_live_under_app"))
        if not mutation.schema_version.strip():
            issues.append(FrontendDtoIssue("schema_version", "schema_version_required"))
        if not mutation.idempotency_key.strip():
            issues.append(FrontendDtoIssue("idempotency_key", "idempotency_key_required"))
        issues.extend(_validate_object(mutation.payload, path="payload", allow_nulls=False))
        for index, route_name in enumerate(mutation.invalidates_routes):
            if not route_name.startswith("/app/"):
                issues.append(
                    FrontendDtoIssue(
                        f"invalidates_routes[{index}]",
                        "route_must_live_under_app",
                    )
                )
        return FrontendContractValidationReport(
            passed=not issues,
            issues=tuple(issues),
            payload_bytes=_payload_bytes(mutation.payload),
        )


def _normalize_value(value: object, *, path: str) -> object:
    if is_dataclass(value):
        return _normalize_value(asdict(value), path=path)
    if isinstance(value, dict):
        normalized: dict[str, object] = {}
        for key, item in value.items():
            if not isinstance(key, str) or not key.strip():
                raise FrontendContractAdapterError(f"{path} keys must be non-empty strings")
            normalized[key] = _normalize_value(item, path=f"{path}.{key}")
        return normalized
    if isinstance(value, tuple | list):
        return [_normalize_value(item, path=f"{path}[]") for item in value]
    if isinstance(value, str):
        return value
    if isinstance(value, bool | int | float) or value is None:
        return value
    raise FrontendContractAdapterError(f"unsupported payload type at {path}: {type(value).__name__}")


def _validate_object(
    payload: object,
    *,
    path: str,
    allow_nulls: bool,
) -> list[FrontendDtoIssue]:
    issues: list[FrontendDtoIssue] = []
    if isinstance(payload, dict):
        if not payload:
            issues.append(FrontendDtoIssue(path, "object_must_not_be_empty"))
        for key, value in payload.items():
            child_path = f"{path}.{key}"
            if value is None:
                if not allow_nulls:
                    issues.append(FrontendDtoIssue(child_path, "value_must_not_be_null"))
                continue
            if key.endswith("_route") and isinstance(value, str) and not value.startswith("/app/"):
                issues.append(FrontendDtoIssue(child_path, "route_must_live_under_app"))
            if key.endswith("_id") and isinstance(value, str) and not value.strip():
                issues.append(FrontendDtoIssue(child_path, "id_must_not_be_blank"))
            issues.extend(_validate_object(value, path=child_path, allow_nulls=allow_nulls))
    elif isinstance(payload, list):
        if not payload:
            issues.append(FrontendDtoIssue(path, "collection_must_not_be_empty"))
        for index, item in enumerate(payload):
            issues.extend(
                _validate_object(item, path=f"{path}[{index}]", allow_nulls=allow_nulls)
            )
    elif isinstance(payload, str):
        if not payload.strip():
            issues.append(FrontendDtoIssue(path, "string_must_not_be_blank"))
    elif not isinstance(payload, bool | int | float):
        issues.append(FrontendDtoIssue(path, "unsupported_scalar_type"))
    return issues


def _payload_bytes(payload: dict[str, object]) -> int:
    return len(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8"))
