"""B-046 sensor event schema and provenance contract."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Mapping

from .device_registry import DeviceRegistryError, DeviceRegistryRecord, DeviceStatus


class SensorEventSchemaError(ValueError):
    """Raised when a sensor event envelope violates the contract."""


class SensorEventType(str, Enum):
    HEARTBEAT = "heartbeat"
    SOIL_MOISTURE = "soil_moisture"
    TEMPERATURE = "temperature"
    RAINFALL = "rainfall"


class SensorTransport(str, Enum):
    MQTT = "mqtt"
    HTTP = "http"
    BATCH = "batch"
    MANUAL_BACKFILL = "manual_backfill"


@dataclass(frozen=True)
class SensorEventProvenance:
    source_message_id: str
    source_provider: str
    transport: SensorTransport
    collected_at: str
    received_at: str
    signature: str
    signer_id: str
    confidence: float
    firmware_version: str
    trace_id: str
    chain_of_custody: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.source_message_id.strip():
            raise SensorEventSchemaError("source_message_id is required")
        if not self.source_provider.strip():
            raise SensorEventSchemaError("source_provider is required")
        if not self.collected_at.strip():
            raise SensorEventSchemaError("collected_at is required")
        if not self.received_at.strip():
            raise SensorEventSchemaError("received_at is required")
        if not self.signature.strip():
            raise SensorEventSchemaError("signature is required")
        if not self.signer_id.strip():
            raise SensorEventSchemaError("signer_id is required")
        if not self.firmware_version.strip():
            raise SensorEventSchemaError("firmware_version is required")
        if not self.trace_id.strip():
            raise SensorEventSchemaError("trace_id is required")
        if not self.chain_of_custody:
            raise SensorEventSchemaError("chain_of_custody must not be empty")
        if not 0 <= self.confidence <= 1:
            raise SensorEventSchemaError("confidence must be between 0 and 1")


@dataclass(frozen=True)
class SensorEventEnvelope:
    event_id: str
    schema_version: str
    device_id: str
    farm_id: str
    country_code: str
    lineage_root_id: str
    registry_version: str
    registry_status: DeviceStatus
    event_type: SensorEventType
    observed_at: str
    payload: Mapping[str, object]
    unit: str
    provenance: SensorEventProvenance
    dedupe_key: str

    def __post_init__(self) -> None:
        if not self.event_id.strip():
            raise SensorEventSchemaError("event_id is required")
        if not self.schema_version.strip():
            raise SensorEventSchemaError("schema_version is required")
        if not self.schema_version.startswith("sensor-event.v"):
            raise SensorEventSchemaError("schema_version must start with sensor-event.v")
        if not self.device_id.strip():
            raise SensorEventSchemaError("device_id is required")
        if not self.farm_id.strip():
            raise SensorEventSchemaError("farm_id is required")
        if not self.country_code.strip():
            raise SensorEventSchemaError("country_code is required")
        if not self.lineage_root_id.strip():
            raise SensorEventSchemaError("lineage_root_id is required")
        if not self.registry_version.strip():
            raise SensorEventSchemaError("registry_version is required")
        if not self.observed_at.strip():
            raise SensorEventSchemaError("observed_at is required")
        if not isinstance(self.payload, Mapping) or not self.payload:
            raise SensorEventSchemaError("payload must be a non-empty mapping")
        if not self.unit.strip():
            raise SensorEventSchemaError("unit is required")
        if not self.dedupe_key.strip():
            raise SensorEventSchemaError("dedupe_key is required")

    def provenance_projection(self) -> dict[str, object]:
        return {
            "event_id": self.event_id,
            "device_id": self.device_id,
            "source_provider": self.provenance.source_provider,
            "signature": self.provenance.signature,
            "confidence": self.provenance.confidence,
            "trace_id": self.provenance.trace_id,
            "schema_version": self.schema_version,
        }


class SensorEventContract:
    """Issues versioned, provenance-complete sensor event envelopes."""

    def __init__(self, *, supported_versions: tuple[str, ...] = ("sensor-event.v1",)) -> None:
        if not supported_versions:
            raise SensorEventSchemaError("supported_versions must not be empty")
        self._supported_versions = supported_versions

    def issue_event(
        self,
        *,
        device: DeviceRegistryRecord,
        event_id: str,
        event_type: SensorEventType,
        observed_at: str,
        payload: Mapping[str, object],
        unit: str,
        provenance: SensorEventProvenance,
        schema_version: str = "sensor-event.v1",
    ) -> SensorEventEnvelope:
        if schema_version not in self._supported_versions:
            raise SensorEventSchemaError("unsupported schema_version")
        if device.status != DeviceStatus.ACTIVE:
            raise SensorEventSchemaError("device must be active before issuing sensor events")

        return SensorEventEnvelope(
            event_id=event_id,
            schema_version=schema_version,
            device_id=device.device_id,
            farm_id=device.farm_id,
            country_code=device.country_code,
            lineage_root_id=device.lineage_root_id,
            registry_version=device.registry_version,
            registry_status=device.status,
            event_type=event_type,
            observed_at=observed_at,
            payload=dict(payload),
            unit=unit,
            provenance=provenance,
            dedupe_key=(
                f"{device.device_id}:{event_type.value}:{observed_at}:"
                f"{provenance.source_message_id}"
            ),
        )

    def validate_against_registry(
        self,
        *,
        event: SensorEventEnvelope,
        device: DeviceRegistryRecord,
    ) -> None:
        if event.device_id != device.device_id:
            raise SensorEventSchemaError("event device_id does not match registry record")
        if event.lineage_root_id != device.lineage_root_id:
            raise SensorEventSchemaError("event lineage_root_id does not match registry record")
        if event.registry_version != device.registry_version:
            raise SensorEventSchemaError("event registry_version does not match registry record")
        if event.registry_status != device.status:
            raise SensorEventSchemaError("event registry_status does not match registry record")
        if event.provenance.firmware_version != device.identity.firmware_version:
            raise SensorEventSchemaError("provenance firmware_version does not match registry")
        if device.status != DeviceStatus.ACTIVE:
            raise SensorEventSchemaError("cannot validate sensor event for inactive device")


def validate_registry_dependency(device: DeviceRegistryRecord) -> None:
    """Surface B-045 contract violations with a schema-specific error type."""
    try:
        if device.status == DeviceStatus.RETIRED:
            raise SensorEventSchemaError("retired device cannot emit sensor events")
    except DeviceRegistryError as exc:
        raise SensorEventSchemaError(str(exc)) from exc
