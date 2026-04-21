"""B-042 device capability abstraction layer for Android-readiness parity."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .mobile_api_profile import MobileApiProfileError, MobileApiProfileRegistry


class DeviceCapabilityError(ValueError):
    """Raised when a capability contract or adapter is invalid."""


class CapabilityType(str, Enum):
    CAMERA = "camera"
    LOCATION = "location"
    STORAGE = "storage"
    BACKGROUND_JOB = "background_job"


class CapabilityAvailability(str, Enum):
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class PermissionState(str, Enum):
    GRANTED = "granted"
    PROMPT_REQUIRED = "prompt_required"
    DENIED = "denied"


class ExecutionMode(str, Enum):
    DIRECT = "direct"
    DEGRADED = "degraded"
    DEFERRED = "deferred"
    BLOCKED = "blocked"


@dataclass(frozen=True)
class DeviceCapabilityContract:
    capability: CapabilityType
    domain_boundary: str
    telemetry_event: str
    profile_endpoint: str | None = None
    requires_permission: bool = True
    background_safe: bool = False

    def __post_init__(self) -> None:
        if not self.domain_boundary.strip():
            raise DeviceCapabilityError("domain_boundary is required")
        if not self.telemetry_event.strip():
            raise DeviceCapabilityError("telemetry_event is required")


@dataclass(frozen=True)
class DeviceCapabilityAdapter:
    adapter_id: str
    capability: CapabilityType
    implementation: str
    availability: CapabilityAvailability
    permission_state: PermissionState = PermissionState.GRANTED
    supports_background: bool = False

    def __post_init__(self) -> None:
        if not self.adapter_id.strip():
            raise DeviceCapabilityError("adapter_id is required")
        if not self.implementation.strip():
            raise DeviceCapabilityError("implementation is required")


@dataclass(frozen=True)
class DeviceCapabilityRequest:
    capability: CapabilityType
    adapter_id: str
    domain_action: str
    profile_version: str
    trace_id: str
    payload: dict[str, object] | None = None
    allow_degraded: bool = False

    def __post_init__(self) -> None:
        if not self.adapter_id.strip():
            raise DeviceCapabilityError("adapter_id is required")
        if not self.domain_action.strip():
            raise DeviceCapabilityError("domain_action is required")
        if not self.profile_version.strip():
            raise DeviceCapabilityError("profile_version is required")
        if not self.trace_id.strip():
            raise DeviceCapabilityError("trace_id is required")


@dataclass(frozen=True)
class CapabilityTelemetryRecord:
    trace_id: str
    capability: CapabilityType
    adapter_id: str
    domain_action: str
    execution_mode: ExecutionMode
    availability: CapabilityAvailability
    telemetry_event: str
    capability_path: str


@dataclass(frozen=True)
class CapabilityExecutionPlan:
    capability: CapabilityType
    adapter_id: str
    domain_action: str
    execution_mode: ExecutionMode
    availability: CapabilityAvailability
    implementation: str
    fallback_reason: str | None
    telemetry_record: CapabilityTelemetryRecord


class DeviceCapabilityAbstractionLayer:
    """Separates Android device capabilities from domain behavior and telemetry."""

    def __init__(self, *, profile_registry: MobileApiProfileRegistry) -> None:
        self._profiles = profile_registry
        self._contracts: dict[CapabilityType, DeviceCapabilityContract] = {}
        self._adapters: dict[str, DeviceCapabilityAdapter] = {}

    def register_contract(self, contract: DeviceCapabilityContract) -> None:
        if contract.capability in self._contracts:
            raise DeviceCapabilityError("capability contract already registered")
        self._contracts[contract.capability] = contract

    def register_adapter(self, adapter: DeviceCapabilityAdapter) -> None:
        if adapter.adapter_id in self._adapters:
            raise DeviceCapabilityError("capability adapter already registered")
        self._adapters[adapter.adapter_id] = adapter

    def assert_compatible(self, *, capability: CapabilityType, adapter_id: str) -> DeviceCapabilityAdapter:
        contract = self._get_contract(capability)
        adapter = self._get_adapter(adapter_id)
        if adapter.capability != capability:
            raise DeviceCapabilityError("adapter capability does not match requested contract")
        if contract.background_safe and not adapter.supports_background:
            raise DeviceCapabilityError("adapter does not satisfy background execution contract")
        return adapter

    def plan(self, request: DeviceCapabilityRequest) -> CapabilityExecutionPlan:
        contract = self._get_contract(request.capability)
        adapter = self.assert_compatible(capability=request.capability, adapter_id=request.adapter_id)

        if contract.profile_endpoint and request.payload is not None:
            try:
                self._profiles.assert_payload_budget(
                    version=request.profile_version,
                    endpoint_name=contract.profile_endpoint,
                    payload=request.payload,
                )
            except MobileApiProfileError as exc:
                raise DeviceCapabilityError(str(exc)) from exc

        fallback_reason: str | None = None
        execution_mode = ExecutionMode.DIRECT

        if contract.requires_permission and adapter.permission_state != PermissionState.GRANTED:
            execution_mode = ExecutionMode.BLOCKED
            fallback_reason = f"permission_{adapter.permission_state.value}"
        elif adapter.availability == CapabilityAvailability.UNAVAILABLE:
            execution_mode = ExecutionMode.BLOCKED
            fallback_reason = "capability_unavailable"
        elif adapter.availability == CapabilityAvailability.DEGRADED:
            if request.allow_degraded:
                execution_mode = ExecutionMode.DEGRADED
                fallback_reason = "degraded_capability"
            else:
                execution_mode = ExecutionMode.DEFERRED
                fallback_reason = "deferred_for_full_capability"

        telemetry = CapabilityTelemetryRecord(
            trace_id=request.trace_id,
            capability=request.capability,
            adapter_id=adapter.adapter_id,
            domain_action=request.domain_action,
            execution_mode=execution_mode,
            availability=adapter.availability,
            telemetry_event=contract.telemetry_event,
            capability_path=f"{request.capability.value}:{adapter.implementation}",
        )
        return CapabilityExecutionPlan(
            capability=request.capability,
            adapter_id=adapter.adapter_id,
            domain_action=request.domain_action,
            execution_mode=execution_mode,
            availability=adapter.availability,
            implementation=adapter.implementation,
            fallback_reason=fallback_reason,
            telemetry_record=telemetry,
        )

    def _get_contract(self, capability: CapabilityType) -> DeviceCapabilityContract:
        try:
            return self._contracts[capability]
        except KeyError as exc:
            raise DeviceCapabilityError("capability contract not registered") from exc

    def _get_adapter(self, adapter_id: str) -> DeviceCapabilityAdapter:
        try:
            return self._adapters[adapter_id]
        except KeyError as exc:
            raise DeviceCapabilityError("capability adapter not registered") from exc
