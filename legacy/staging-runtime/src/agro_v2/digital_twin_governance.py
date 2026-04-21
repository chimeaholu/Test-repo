"""B-049 digital twin readiness compatibility and governance boundary model."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .country_pack import resolve_country_policy
from .event_bus_partitioning import EventBusTopicRoute
from .sensor_event_schema import SensorEventEnvelope


class TwinDataClass(str, Enum):
    SENSOR_ORIGIN = "sensor_origin"
    USER_ENTERED = "user_entered"
    DERIVED_TWIN = "derived_twin"


class TwinGovernanceAction(str, Enum):
    READ = "read"
    WRITE = "write"
    MODEL_USE = "model_use"


class DigitalTwinGovernanceError(ValueError):
    """Raised when the readiness model or governance boundary is violated."""


@dataclass(frozen=True)
class TwinFieldDefinition:
    field_name: str
    field_type: str
    data_class: TwinDataClass
    source_refs: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.field_name.strip():
            raise DigitalTwinGovernanceError("field_name is required")
        if not self.field_type.strip():
            raise DigitalTwinGovernanceError("field_type is required")
        if not self.source_refs:
            raise DigitalTwinGovernanceError("source_refs must not be empty")


@dataclass(frozen=True)
class TwinSchemaDefinition:
    schema_version: str
    fields: tuple[TwinFieldDefinition, ...]
    hardware_control_enabled: bool = False

    def __post_init__(self) -> None:
        if not self.schema_version.strip():
            raise DigitalTwinGovernanceError("schema_version is required")
        if not self.schema_version.startswith("digital-twin.v"):
            raise DigitalTwinGovernanceError("schema_version must start with digital-twin.v")
        if not self.fields:
            raise DigitalTwinGovernanceError("fields must not be empty")
        field_names = [field.field_name for field in self.fields]
        if len(field_names) != len(set(field_names)):
            raise DigitalTwinGovernanceError("field_name values must be unique")
        if self.hardware_control_enabled:
            raise DigitalTwinGovernanceError("hardware_control_enabled must remain false for MVP")


@dataclass(frozen=True)
class TwinGovernancePolicy:
    country_code: str
    retention_days_sensor_origin: int
    read_roles: tuple[str, ...]
    write_roles: tuple[str, ...]
    model_use_roles: tuple[str, ...]
    blocked_hardware_actions: tuple[str, ...] = (
        "actuate_device",
        "calibrate_sensor",
        "deploy_hardware",
        "firmware_push",
        "remote_control",
    )

    def __post_init__(self) -> None:
        if not self.country_code.strip():
            raise DigitalTwinGovernanceError("country_code is required")
        if self.retention_days_sensor_origin <= 0:
            raise DigitalTwinGovernanceError("retention_days_sensor_origin must be > 0")
        if not self.read_roles:
            raise DigitalTwinGovernanceError("read_roles must not be empty")
        if not self.write_roles:
            raise DigitalTwinGovernanceError("write_roles must not be empty")
        if not self.model_use_roles:
            raise DigitalTwinGovernanceError("model_use_roles must not be empty")


@dataclass(frozen=True)
class TwinStateProjection:
    farm_node_id: str
    state_snapshot_version: str
    sensor_state_refs: tuple[str, ...]
    derived_health_score: float
    last_reconciled_at: str
    source_event_id: str
    source_topic_name: str
    source_partition_key: str
    country_code: str
    region: str
    data_class: TwinDataClass
    retention_days: int
    allowed_read_roles: tuple[str, ...]
    allowed_write_roles: tuple[str, ...]
    allowed_model_use_roles: tuple[str, ...]
    governance_boundary: str
    data_check_id: str

    def __post_init__(self) -> None:
        if not self.farm_node_id.strip():
            raise DigitalTwinGovernanceError("farm_node_id is required")
        if not self.state_snapshot_version.strip():
            raise DigitalTwinGovernanceError("state_snapshot_version is required")
        if not self.sensor_state_refs:
            raise DigitalTwinGovernanceError("sensor_state_refs must not be empty")
        if not 0 <= self.derived_health_score <= 1:
            raise DigitalTwinGovernanceError("derived_health_score must be between 0 and 1")
        if not self.last_reconciled_at.strip():
            raise DigitalTwinGovernanceError("last_reconciled_at is required")
        if not self.source_event_id.strip():
            raise DigitalTwinGovernanceError("source_event_id is required")
        if not self.source_topic_name.strip():
            raise DigitalTwinGovernanceError("source_topic_name is required")
        if not self.source_partition_key.strip():
            raise DigitalTwinGovernanceError("source_partition_key is required")
        if not self.country_code.strip():
            raise DigitalTwinGovernanceError("country_code is required")
        if not self.region.strip():
            raise DigitalTwinGovernanceError("region is required")
        if self.retention_days <= 0:
            raise DigitalTwinGovernanceError("retention_days must be > 0")
        if not self.governance_boundary.strip():
            raise DigitalTwinGovernanceError("governance_boundary is required")
        if not self.data_check_id.strip():
            raise DigitalTwinGovernanceError("data_check_id is required")


class DigitalTwinReadinessModel:
    """Keeps future twin evolution additive and hardware execution explicitly deferred."""

    _REQUIRED_TWIN_FIELDS = {
        "farm_node_id",
        "state_snapshot_version",
        "sensor_state_refs",
        "derived_health_score",
        "last_reconciled_at",
    }

    def __init__(self, *, policies: tuple[TwinGovernancePolicy, ...] | None = None) -> None:
        default_policies = policies or (
            TwinGovernancePolicy(
                country_code="GH",
                retention_days_sensor_origin=365,
                read_roles=("iot_ops", "analytics", "admin"),
                write_roles=("iot_ops", "admin"),
                model_use_roles=("analytics", "ml_ops", "admin"),
            ),
            TwinGovernancePolicy(
                country_code="NG",
                retention_days_sensor_origin=365,
                read_roles=("iot_ops", "analytics", "admin"),
                write_roles=("iot_ops", "admin"),
                model_use_roles=("analytics", "ml_ops", "admin"),
            ),
            TwinGovernancePolicy(
                country_code="JM",
                retention_days_sensor_origin=180,
                read_roles=("iot_ops", "analytics", "admin"),
                write_roles=("iot_ops", "admin"),
                model_use_roles=("analytics", "ml_ops", "admin"),
            ),
        )
        self._policies = {policy.country_code.upper(): policy for policy in default_policies}
        self._schemas: dict[str, TwinSchemaDefinition] = {}

    def register_schema(self, schema: TwinSchemaDefinition) -> None:
        required_fields = {field.field_name for field in schema.fields}
        if not self._REQUIRED_TWIN_FIELDS.issubset(required_fields):
            raise DigitalTwinGovernanceError("schema must include the required twin readiness fields")
        if schema.schema_version in self._schemas:
            raise DigitalTwinGovernanceError("schema_version already registered")
        self._schemas[schema.schema_version] = schema

    def assert_additive_compatibility(
        self,
        *,
        previous_version: str,
        next_schema: TwinSchemaDefinition,
    ) -> None:
        previous = self._get_schema(previous_version)
        previous_fields = {field.field_name: field for field in previous.fields}
        next_fields = {field.field_name: field for field in next_schema.fields}

        missing = set(previous_fields).difference(next_fields)
        if missing:
            raise DigitalTwinGovernanceError("twin schema evolution must be additive only")

        for field_name, previous_field in previous_fields.items():
            next_field = next_fields[field_name]
            if previous_field.field_type != next_field.field_type:
                raise DigitalTwinGovernanceError("field_type cannot change across twin versions")
            if previous_field.data_class != next_field.data_class:
                raise DigitalTwinGovernanceError("data_class cannot change across twin versions")
            if previous_field.source_refs != next_field.source_refs:
                raise DigitalTwinGovernanceError("source_refs cannot change across twin versions")

    def project_sensor_state(
        self,
        *,
        event: SensorEventEnvelope,
        route: EventBusTopicRoute,
        schema_version: str,
        last_reconciled_at: str,
        derived_health_score: float,
    ) -> TwinStateProjection:
        self._get_schema(schema_version)
        policy = self._get_policy(event.country_code)
        country = resolve_country_policy(event.country_code)
        if route.country_code.upper() != country.country_code:
            raise DigitalTwinGovernanceError("route country_code mismatch")
        if route.farm_id != event.farm_id:
            raise DigitalTwinGovernanceError("route farm_id mismatch")

        sensor_state_ref = (
            f"{route.topic_name}:{event.event_id}:{event.provenance.trace_id}:{event.observed_at}"
        )
        return TwinStateProjection(
            farm_node_id=f"{event.farm_id}:{event.device_id}",
            state_snapshot_version=schema_version,
            sensor_state_refs=(sensor_state_ref,),
            derived_health_score=derived_health_score,
            last_reconciled_at=last_reconciled_at,
            source_event_id=event.event_id,
            source_topic_name=route.topic_name,
            source_partition_key=route.partition_key,
            country_code=country.country_code,
            region=country.region,
            data_class=TwinDataClass.SENSOR_ORIGIN,
            retention_days=policy.retention_days_sensor_origin,
            allowed_read_roles=policy.read_roles,
            allowed_write_roles=policy.write_roles,
            allowed_model_use_roles=policy.model_use_roles,
            governance_boundary="sensor-origin-vs-user-entered",
            data_check_id="IOTDI-005",
        )

    def assert_access(
        self,
        *,
        projection: TwinStateProjection,
        action: TwinGovernanceAction,
        actor_role: str,
    ) -> None:
        allowed_roles = {
            TwinGovernanceAction.READ: projection.allowed_read_roles,
            TwinGovernanceAction.WRITE: projection.allowed_write_roles,
            TwinGovernanceAction.MODEL_USE: projection.allowed_model_use_roles,
        }[action]
        if actor_role not in allowed_roles:
            raise DigitalTwinGovernanceError(
                f"role {actor_role} is not allowed to {action.value} {projection.data_class.value} data"
            )

    def assert_hardware_deferred(self, action_name: str, *, country_code: str) -> None:
        policy = self._get_policy(country_code)
        normalized = action_name.strip().lower()
        if not normalized:
            raise DigitalTwinGovernanceError("action_name is required")
        if normalized in policy.blocked_hardware_actions:
            raise DigitalTwinGovernanceError("hardware execution is explicitly deferred from MVP")

    def _get_schema(self, schema_version: str) -> TwinSchemaDefinition:
        try:
            return self._schemas[schema_version]
        except KeyError as exc:
            raise DigitalTwinGovernanceError("unknown twin schema_version") from exc

    def _get_policy(self, country_code: str) -> TwinGovernancePolicy:
        try:
            return self._policies[country_code.strip().upper()]
        except KeyError as exc:
            raise DigitalTwinGovernanceError("unsupported governance policy country_code") from exc
