from agro_v2.device_registry import (
    DeviceClass,
    DeviceIdentity,
    DeviceRegistryRecord,
    DeviceStatus,
    DeviceStatusChange,
)
from agro_v2.event_bus_partitioning import (
    EventBusPartitioningError,
    EventBusTopicPartitioningModel,
    TelemetryTopicFamily,
)
from agro_v2.sensor_event_schema import (
    SensorEventContract,
    SensorEventProvenance,
    SensorEventType,
    SensorTransport,
)
from agro_v2.telemetry_ingestion_api import TelemetryIngestionApiProfile, TelemetryIngestionBatch
from agro_v2.tool_contracts import ToolContractRegistry


def build_record(*, farm_id: str = "farm-048", country_code: str = "GH") -> DeviceRegistryRecord:
    return DeviceRegistryRecord(
        device_id=f"device-{farm_id}",
        farm_id=farm_id,
        country_code=country_code,
        registry_version="device-registry.v1",
        device_class=DeviceClass.SENSOR_NODE,
        identity=DeviceIdentity(
            hardware_serial=f"SN-{farm_id}",
            hardware_fingerprint=f"fp-{farm_id}",
            manufacturer="AgroNode",
            model="AN-Env-2",
            firmware_version="2.4.0",
            network_address="10.0.0.48",
        ),
        status=DeviceStatus.ACTIVE,
        registered_at="2026-04-13T10:00:00Z",
        owner_subject_id="coop-048",
        status_history=(
            DeviceStatusChange(
                previous_status=None,
                next_status=DeviceStatus.PROVISIONED,
                changed_at="2026-04-13T10:00:00Z",
                reason="factory_onboarded",
                actor_id="ops-048",
            ),
            DeviceStatusChange(
                previous_status=DeviceStatus.PROVISIONED,
                next_status=DeviceStatus.ACTIVE,
                changed_at="2026-04-13T10:05:00Z",
                reason="field_installation_complete",
                actor_id="ops-048",
            ),
        ),
    )


def build_event(
    *,
    event_id: str,
    event_type: SensorEventType,
    farm_id: str = "farm-048",
    country_code: str = "GH",
    observed_at: str = "2026-04-13T10:15:00Z",
):
    contract = SensorEventContract()
    return contract.issue_event(
        device=build_record(farm_id=farm_id, country_code=country_code),
        event_id=event_id,
        event_type=event_type,
        observed_at=observed_at,
        payload={"value": 0.24},
        unit="ratio" if event_type == SensorEventType.SOIL_MOISTURE else "count",
        provenance=SensorEventProvenance(
            source_message_id=f"msg-{event_id}",
            source_provider="edge-gateway",
            transport=SensorTransport.HTTP,
            collected_at=observed_at,
            received_at="2026-04-13T10:15:02Z",
            signature=f"sig-{event_id}",
            signer_id="gateway-048",
            confidence=0.97,
            firmware_version="2.4.0",
            trace_id=f"trace-{event_id}",
            chain_of_custody=("sensor-node", "gateway", "telemetry-api"),
        ),
    )


def build_batch(*events, session_id: str = "session-048", batch_index: int = 0) -> TelemetryIngestionBatch:
    return TelemetryIngestionBatch(
        api_version="telemetry-ingest.v1",
        session_id=session_id,
        batch_index=batch_index,
        idempotency_key=f"idem-{session_id}-{batch_index}",
        received_at="2026-04-13T10:15:05Z",
        events=events,
    )


def test_routes_farm_scoped_sensor_events_to_region_taxonomy():
    ingest = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T10:15:10Z")
    model = EventBusTopicPartitioningModel()
    batch = build_batch(
        build_event(event_id="evt-048-soil", event_type=SensorEventType.SOIL_MOISTURE),
        build_event(
            event_id="evt-048-rain",
            event_type=SensorEventType.RAINFALL,
            observed_at="2026-04-13T10:16:00Z",
        ),
    )

    routes = model.plan_routes(batch=batch, receipt=ingest.ingest(batch))

    assert len(routes) == 2
    assert routes[0].topic_name == "telemetry.west_africa.soil"
    assert routes[0].topic_family == TelemetryTopicFamily.SOIL
    assert routes[0].partition_key == "farm:farm-048"
    assert routes[0].data_check_id == "IOTDI-004"
    assert routes[1].topic_name == "telemetry.west_africa.climate"


def test_partition_keys_remain_consistent_for_same_farm_across_batches():
    ingest = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T10:15:10Z")
    model = EventBusTopicPartitioningModel()

    first_batch = build_batch(
        build_event(event_id="evt-048-1", event_type=SensorEventType.SOIL_MOISTURE)
    )
    first_receipt = ingest.ingest(first_batch)
    [first_route] = model.plan_routes(batch=first_batch, receipt=first_receipt)

    second_batch = build_batch(
        build_event(
            event_id="evt-048-2",
            event_type=SensorEventType.SOIL_MOISTURE,
            observed_at="2026-04-13T10:20:00Z",
        ),
        session_id="session-048",
        batch_index=1,
    )
    second_batch = TelemetryIngestionBatch(
        api_version=second_batch.api_version,
        session_id=second_batch.session_id,
        batch_index=second_batch.batch_index,
        idempotency_key=second_batch.idempotency_key,
        received_at=second_batch.received_at,
        events=second_batch.events,
        resume_token=first_receipt.next_resume_token,
        final_batch=True,
    )
    second_receipt = ingest.ingest(second_batch)
    [second_route] = model.plan_routes(batch=second_batch, receipt=second_receipt)

    assert first_route.partition_key == second_route.partition_key
    assert first_route.topic_name == second_route.topic_name
    assert second_route.replay_safe_key == (
        "session-048:1:"
        "device-farm-048:soil_moisture:2026-04-13T10:20:00Z:msg-evt-048-2"
    )


def test_heartbeat_routes_to_region_partition_scope():
    ingest = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T10:15:10Z")
    model = EventBusTopicPartitioningModel()
    batch = build_batch(
        build_event(event_id="evt-048-heartbeat", event_type=SensorEventType.HEARTBEAT)
    )

    [route] = model.plan_routes(batch=batch, receipt=ingest.ingest(batch))

    assert route.topic_name == "telemetry.west_africa.operations"
    assert route.partition_scope == "region"
    assert route.partition_key == "region:west_africa:GH"


def test_receipt_mismatch_is_rejected_and_contract_is_registered():
    registry = ToolContractRegistry()
    ingest = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T10:15:10Z")
    model = EventBusTopicPartitioningModel(contract_registry=registry)
    batch = build_batch(
        build_event(event_id="evt-048-contract", event_type=SensorEventType.TEMPERATURE)
    )
    receipt = ingest.ingest(batch)

    contract = registry.get("telemetry.route_event_bus_topic", "telemetry-ingest.v1")
    assert contract.tool_name == "telemetry.route_event_bus_topic"

    try:
        model.plan_routes(
            batch=batch,
            receipt=type(receipt)(
                session_id="wrong-session",
                batch_index=receipt.batch_index,
                accepted_event_ids=receipt.accepted_event_ids,
                duplicate_event_ids=receipt.duplicate_event_ids,
                effective_event_count=receipt.effective_event_count,
                session_status=receipt.session_status,
                committed_at=receipt.committed_at,
                next_resume_token=receipt.next_resume_token,
            ),
        )
    except EventBusPartitioningError as exc:
        assert "session_id mismatch" in str(exc)
    else:
        raise AssertionError("expected EventBusPartitioningError")
