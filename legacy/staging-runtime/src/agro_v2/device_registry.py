"""B-045 device registry and identity schema primitives."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from enum import Enum

from .country_pack import resolve_country_policy
from .state_store import WorkflowCommand


class DeviceRegistryError(ValueError):
    """Raised when a device registry record or transition is invalid."""


class DeviceClass(str, Enum):
    SENSOR_NODE = "sensor_node"
    GATEWAY = "gateway"
    HANDSET = "handset"


class DeviceStatus(str, Enum):
    PROVISIONED = "provisioned"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    RETIRED = "retired"


@dataclass(frozen=True)
class DeviceIdentity:
    hardware_serial: str
    hardware_fingerprint: str
    manufacturer: str
    model: str
    firmware_version: str
    network_address: str | None = None

    def __post_init__(self) -> None:
        if not self.hardware_serial.strip():
            raise DeviceRegistryError("hardware_serial is required")
        if not self.hardware_fingerprint.strip():
            raise DeviceRegistryError("hardware_fingerprint is required")
        if not self.manufacturer.strip():
            raise DeviceRegistryError("manufacturer is required")
        if not self.model.strip():
            raise DeviceRegistryError("model is required")
        if not self.firmware_version.strip():
            raise DeviceRegistryError("firmware_version is required")
        if self.network_address is not None and not self.network_address.strip():
            raise DeviceRegistryError("network_address must be non-empty when provided")


@dataclass(frozen=True)
class DeviceStatusChange:
    previous_status: DeviceStatus | None
    next_status: DeviceStatus
    changed_at: str
    reason: str
    actor_id: str

    def __post_init__(self) -> None:
        if not self.changed_at.strip():
            raise DeviceRegistryError("changed_at is required")
        if not self.reason.strip():
            raise DeviceRegistryError("reason is required")
        if not self.actor_id.strip():
            raise DeviceRegistryError("actor_id is required")
        if self.previous_status == self.next_status:
            raise DeviceRegistryError("status transition must change state")


@dataclass(frozen=True)
class DeviceRegistryRecord:
    device_id: str
    farm_id: str
    country_code: str
    registry_version: str
    device_class: DeviceClass
    identity: DeviceIdentity
    status: DeviceStatus
    registered_at: str
    owner_subject_id: str
    lineage_root_id: str = ""
    parent_device_id: str | None = None
    status_history: tuple[DeviceStatusChange, ...] = ()
    metadata: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.device_id.strip():
            raise DeviceRegistryError("device_id is required")
        if not self.farm_id.strip():
            raise DeviceRegistryError("farm_id is required")
        if not self.country_code.strip():
            raise DeviceRegistryError("country_code is required")
        if not self.registry_version.strip():
            raise DeviceRegistryError("registry_version is required")
        if not self.registered_at.strip():
            raise DeviceRegistryError("registered_at is required")
        if not self.owner_subject_id.strip():
            raise DeviceRegistryError("owner_subject_id is required")
        if self.parent_device_id is not None and not self.parent_device_id.strip():
            raise DeviceRegistryError("parent_device_id must be non-empty when provided")
        if not self.status_history:
            raise DeviceRegistryError("status_history must not be empty")
        if self.status_history[-1].next_status != self.status:
            raise DeviceRegistryError("status_history must terminate at current status")

        resolve_country_policy(self.country_code)
        if not self.lineage_root_id:
            object.__setattr__(self, "lineage_root_id", self.device_id)

    def to_workflow_command(
        self,
        *,
        workflow_id: str,
        idempotency_key: str,
        channel: str = "system",
    ) -> WorkflowCommand:
        return WorkflowCommand(
            workflow_id=workflow_id,
            channel=channel,
            idempotency_key=idempotency_key,
            event_type="device.registry.upserted",
            state_delta={
                "device_registry": {
                    "device_id": self.device_id,
                    "farm_id": self.farm_id,
                    "country_code": self.country_code,
                    "registry_version": self.registry_version,
                    "device_class": self.device_class.value,
                    "status": self.status.value,
                    "owner_subject_id": self.owner_subject_id,
                    "lineage_root_id": self.lineage_root_id,
                    "parent_device_id": self.parent_device_id,
                    "identity": {
                        "hardware_serial": self.identity.hardware_serial,
                        "hardware_fingerprint": self.identity.hardware_fingerprint,
                        "manufacturer": self.identity.manufacturer,
                        "model": self.identity.model,
                        "firmware_version": self.identity.firmware_version,
                        "network_address": self.identity.network_address,
                    },
                    "status_history": [
                        {
                            "previous_status": (
                                change.previous_status.value
                                if change.previous_status is not None
                                else None
                            ),
                            "next_status": change.next_status.value,
                            "changed_at": change.changed_at,
                            "reason": change.reason,
                            "actor_id": change.actor_id,
                        }
                        for change in self.status_history
                    ],
                    "metadata": dict(self.metadata),
                }
            },
            metadata={
                "journey": "IOTJ-001",
                "data_check": "IOTDI-001",
                "country_code": self.country_code,
            },
        )


class DeviceRegistryService:
    """Tracks device identity lifecycle for future farm-node integrations."""

    _ALLOWED_TRANSITIONS = {
        DeviceStatus.PROVISIONED: {DeviceStatus.ACTIVE, DeviceStatus.SUSPENDED, DeviceStatus.RETIRED},
        DeviceStatus.ACTIVE: {DeviceStatus.SUSPENDED, DeviceStatus.RETIRED},
        DeviceStatus.SUSPENDED: {DeviceStatus.ACTIVE, DeviceStatus.RETIRED},
        DeviceStatus.RETIRED: set(),
    }

    def __init__(self) -> None:
        self._records: dict[str, DeviceRegistryRecord] = {}

    def register(self, record: DeviceRegistryRecord) -> DeviceRegistryRecord:
        if record.device_id in self._records:
            raise DeviceRegistryError("device_id already registered")
        self._records[record.device_id] = record
        return record

    def get(self, device_id: str) -> DeviceRegistryRecord:
        try:
            return self._records[device_id]
        except KeyError as exc:
            raise DeviceRegistryError("device_id is not registered") from exc

    def transition(
        self,
        *,
        device_id: str,
        next_status: DeviceStatus,
        changed_at: str,
        reason: str,
        actor_id: str,
    ) -> DeviceRegistryRecord:
        current = self.get(device_id)
        allowed = self._ALLOWED_TRANSITIONS[current.status]
        if next_status not in allowed:
            raise DeviceRegistryError(
                f"invalid lifecycle transition: {current.status.value}->{next_status.value}"
            )

        updated = replace(
            current,
            status=next_status,
            status_history=current.status_history
            + (
                DeviceStatusChange(
                    previous_status=current.status,
                    next_status=next_status,
                    changed_at=changed_at,
                    reason=reason,
                    actor_id=actor_id,
                ),
            ),
        )
        self._records[device_id] = updated
        return updated

    def list_for_farm(self, farm_id: str) -> tuple[DeviceRegistryRecord, ...]:
        return tuple(
            record
            for record in self._records.values()
            if record.farm_id == farm_id
        )
