"""B-048 event bus topic taxonomy and partition strategy for telemetry streams."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .country_pack import resolve_country_policy
from .sensor_event_schema import SensorEventEnvelope, SensorEventType
from .telemetry_ingestion_api import TelemetryIngestionBatch, TelemetryIngestionReceipt
from .tool_contracts import ContractField, ContractValueType, ToolContract, ToolContractRegistry


class EventBusPartitioningError(ValueError):
    """Raised when telemetry events cannot be routed deterministically."""


class TelemetryTopicFamily(str, Enum):
    SOIL = "soil"
    CLIMATE = "climate"
    OPERATIONS = "operations"


@dataclass(frozen=True)
class EventBusTopicRoute:
    event_id: str
    session_id: str
    batch_index: int
    farm_id: str
    country_code: str
    region: str
    topic_name: str
    topic_family: TelemetryTopicFamily
    partition_key: str
    partition_scope: str
    ordering_key: str
    replay_safe_key: str
    data_check_id: str

    def __post_init__(self) -> None:
        if not self.event_id.strip():
            raise EventBusPartitioningError("event_id is required")
        if not self.session_id.strip():
            raise EventBusPartitioningError("session_id is required")
        if self.batch_index < 0:
            raise EventBusPartitioningError("batch_index must be >= 0")
        if not self.farm_id.strip():
            raise EventBusPartitioningError("farm_id is required")
        if not self.country_code.strip():
            raise EventBusPartitioningError("country_code is required")
        if not self.region.strip():
            raise EventBusPartitioningError("region is required")
        if not self.topic_name.strip():
            raise EventBusPartitioningError("topic_name is required")
        if not self.partition_key.strip():
            raise EventBusPartitioningError("partition_key is required")
        if self.partition_scope not in {"farm", "region"}:
            raise EventBusPartitioningError("partition_scope must be farm or region")
        if not self.ordering_key.strip():
            raise EventBusPartitioningError("ordering_key is required")
        if not self.replay_safe_key.strip():
            raise EventBusPartitioningError("replay_safe_key is required")
        if not self.data_check_id.strip():
            raise EventBusPartitioningError("data_check_id is required")

    def as_payload(self) -> dict[str, object]:
        return {
            "event_id": self.event_id,
            "session_id": self.session_id,
            "batch_index": self.batch_index,
            "farm_id": self.farm_id,
            "country_code": self.country_code,
            "region": self.region,
            "topic_name": self.topic_name,
            "topic_family": self.topic_family.value,
            "partition_key": self.partition_key,
            "partition_scope": self.partition_scope,
            "ordering_key": self.ordering_key,
            "replay_safe_key": self.replay_safe_key,
            "data_check_id": self.data_check_id,
        }


class EventBusTopicPartitioningModel:
    """Projects ingested telemetry into deterministic topic and partition metadata."""

    def __init__(
        self,
        *,
        supported_api_versions: tuple[str, ...] = ("telemetry-ingest.v1",),
        contract_registry: ToolContractRegistry | None = None,
    ) -> None:
        if not supported_api_versions:
            raise EventBusPartitioningError("supported_api_versions must not be empty")
        self._supported_api_versions = supported_api_versions
        self._contract_registry = contract_registry or ToolContractRegistry()
        self._register_default_contract()

    def plan_routes(
        self,
        *,
        batch: TelemetryIngestionBatch,
        receipt: TelemetryIngestionReceipt,
    ) -> tuple[EventBusTopicRoute, ...]:
        if batch.api_version not in self._supported_api_versions:
            raise EventBusPartitioningError("unsupported api_version")
        if receipt.session_id != batch.session_id:
            raise EventBusPartitioningError("receipt session_id mismatch")
        if receipt.batch_index != batch.batch_index:
            raise EventBusPartitioningError("receipt batch_index mismatch")

        accepted_event_ids = set(receipt.accepted_event_ids)
        routes = []
        for event in batch.events:
            if event.event_id not in accepted_event_ids:
                continue
            route = self._route_event(
                event=event,
                session_id=batch.session_id,
                batch_index=batch.batch_index,
            )
            self._contract_registry.validate_output(
                tool_name="telemetry.route_event_bus_topic",
                version=batch.api_version,
                payload=route.as_payload(),
            )
            routes.append(route)
        return tuple(routes)

    def _route_event(
        self,
        *,
        event: SensorEventEnvelope,
        session_id: str,
        batch_index: int,
    ) -> EventBusTopicRoute:
        policy = resolve_country_policy(event.country_code)
        topic_family, stream_name = _topic_for_event_type(event.event_type)
        partition_scope = "farm" if topic_family != TelemetryTopicFamily.OPERATIONS else "region"
        partition_key = (
            f"farm:{event.farm_id}"
            if partition_scope == "farm"
            else f"region:{policy.region}:{event.country_code.upper()}"
        )
        return EventBusTopicRoute(
            event_id=event.event_id,
            session_id=session_id,
            batch_index=batch_index,
            farm_id=event.farm_id,
            country_code=event.country_code.upper(),
            region=policy.region,
            topic_name=f"telemetry.{policy.region}.{stream_name}",
            topic_family=topic_family,
            partition_key=partition_key,
            partition_scope=partition_scope,
            ordering_key=f"{partition_key}:{event.device_id}:{event.observed_at}",
            replay_safe_key=f"{session_id}:{batch_index}:{event.dedupe_key}",
            data_check_id="IOTDI-004",
        )

    def _register_default_contract(self) -> None:
        self._contract_registry.register(
            ToolContract(
                tool_name="telemetry.route_event_bus_topic",
                version="telemetry-ingest.v1",
                input_fields=(
                    ContractField("session_id", ContractValueType.STRING, required=True),
                    ContractField("batch_index", ContractValueType.INTEGER, required=True),
                    ContractField("event_id", ContractValueType.STRING, required=True),
                    ContractField("event_type", ContractValueType.STRING, required=True),
                    ContractField("farm_id", ContractValueType.STRING, required=True),
                    ContractField("country_code", ContractValueType.STRING, required=True),
                ),
                output_fields=(
                    ContractField("event_id", ContractValueType.STRING, required=True),
                    ContractField("session_id", ContractValueType.STRING, required=True),
                    ContractField("batch_index", ContractValueType.INTEGER, required=True),
                    ContractField("farm_id", ContractValueType.STRING, required=True),
                    ContractField("country_code", ContractValueType.STRING, required=True),
                    ContractField("region", ContractValueType.STRING, required=True),
                    ContractField("topic_name", ContractValueType.STRING, required=True),
                    ContractField("topic_family", ContractValueType.STRING, required=True),
                    ContractField("partition_key", ContractValueType.STRING, required=True),
                    ContractField("partition_scope", ContractValueType.STRING, required=True),
                    ContractField("ordering_key", ContractValueType.STRING, required=True),
                    ContractField("replay_safe_key", ContractValueType.STRING, required=True),
                    ContractField("data_check_id", ContractValueType.STRING, required=True),
                ),
            )
        )


def _topic_for_event_type(event_type: SensorEventType) -> tuple[TelemetryTopicFamily, str]:
    if event_type == SensorEventType.SOIL_MOISTURE:
        return TelemetryTopicFamily.SOIL, "soil"
    if event_type in {SensorEventType.TEMPERATURE, SensorEventType.RAINFALL}:
        return TelemetryTopicFamily.CLIMATE, "climate"
    if event_type == SensorEventType.HEARTBEAT:
        return TelemetryTopicFamily.OPERATIONS, "operations"
    raise EventBusPartitioningError(f"unsupported event_type: {event_type}")
