from agro_v2.device_registry import (
    DeviceClass,
    DeviceIdentity,
    DeviceRegistryRecord,
    DeviceStatus,
    DeviceStatusChange,
)
from agro_v2.digital_twin_governance import (
    DigitalTwinGovernanceError,
    DigitalTwinReadinessModel,
    TwinDataClass,
    TwinFieldDefinition,
    TwinGovernanceAction,
    TwinSchemaDefinition,
)
from agro_v2.event_bus_partitioning import EventBusTopicPartitioningModel
from agro_v2.sensor_event_schema import (
    SensorEventContract,
    SensorEventProvenance,
    SensorEventType,
    SensorTransport,
)
from agro_v2.telemetry_ingestion_api import TelemetryIngestionApiProfile, TelemetryIngestionBatch


def build_record(*, farm_id: str = "farm-049", country_code: str = "GH") -> DeviceRegistryRecord:
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
            model="AN-Twin-1",
            firmware_version="2.5.0",
            network_address="10.0.0.49",
        ),
        status=DeviceStatus.ACTIVE,
        registered_at="2026-04-13T11:00:00Z",
        owner_subject_id="coop-049",
        status_history=(
            DeviceStatusChange(
                previous_status=None,
                next_status=DeviceStatus.PROVISIONED,
                changed_at="2026-04-13T11:00:00Z",
                reason="factory_onboarded",
                actor_id="ops-049",
            ),
            DeviceStatusChange(
                previous_status=DeviceStatus.PROVISIONED,
                next_status=DeviceStatus.ACTIVE,
                changed_at="2026-04-13T11:05:00Z",
                reason="field_installation_complete",
                actor_id="ops-049",
            ),
        ),
    )


def build_event():
    return SensorEventContract().issue_event(
        device=build_record(),
        event_id="evt-049-1",
        event_type=SensorEventType.SOIL_MOISTURE,
        observed_at="2026-04-13T11:10:00Z",
        payload={"value": 0.21},
        unit="ratio",
        provenance=SensorEventProvenance(
            source_message_id="msg-049-1",
            source_provider="edge-gateway",
            transport=SensorTransport.HTTP,
            collected_at="2026-04-13T11:10:00Z",
            received_at="2026-04-13T11:10:02Z",
            signature="sig-049-1",
            signer_id="gateway-049",
            confidence=0.96,
            firmware_version="2.5.0",
            trace_id="trace-049-1",
            chain_of_custody=("sensor-node", "gateway", "telemetry-api"),
        ),
    )


def build_schema(version: str, *extra_fields: TwinFieldDefinition) -> TwinSchemaDefinition:
    base_fields = (
        TwinFieldDefinition("farm_node_id", "string", TwinDataClass.DERIVED_TWIN, ("B-045",)),
        TwinFieldDefinition(
            "state_snapshot_version", "string", TwinDataClass.DERIVED_TWIN, ("B-049",)
        ),
        TwinFieldDefinition(
            "sensor_state_refs", "array<string>", TwinDataClass.SENSOR_ORIGIN, ("B-046", "B-048")
        ),
        TwinFieldDefinition(
            "derived_health_score", "float", TwinDataClass.DERIVED_TWIN, ("B-049",)
        ),
        TwinFieldDefinition(
            "last_reconciled_at", "timestamp", TwinDataClass.DERIVED_TWIN, ("B-049",)
        ),
    )
    return TwinSchemaDefinition(schema_version=version, fields=base_fields + extra_fields)


def test_twin_schema_evolution_allows_additive_fields_only():
    model = DigitalTwinReadinessModel()
    v1 = build_schema("digital-twin.v1")
    model.register_schema(v1)

    v2 = build_schema(
        "digital-twin.v2",
        TwinFieldDefinition(
            "water_stress_index",
            "float",
            TwinDataClass.DERIVED_TWIN,
            ("B-049",),
        ),
    )

    model.assert_additive_compatibility(previous_version="digital-twin.v1", next_schema=v2)
    model.register_schema(v2)


def test_twin_schema_rejects_field_type_changes():
    model = DigitalTwinReadinessModel()
    model.register_schema(build_schema("digital-twin.v1"))
    breaking = TwinSchemaDefinition(
        schema_version="digital-twin.v2",
        fields=(
            TwinFieldDefinition("farm_node_id", "string", TwinDataClass.DERIVED_TWIN, ("B-045",)),
            TwinFieldDefinition(
                "state_snapshot_version", "string", TwinDataClass.DERIVED_TWIN, ("B-049",)
            ),
            TwinFieldDefinition(
                "sensor_state_refs", "mapping", TwinDataClass.SENSOR_ORIGIN, ("B-046", "B-048")
            ),
            TwinFieldDefinition(
                "derived_health_score", "float", TwinDataClass.DERIVED_TWIN, ("B-049",)
            ),
            TwinFieldDefinition(
                "last_reconciled_at", "timestamp", TwinDataClass.DERIVED_TWIN, ("B-049",)
            ),
        ),
    )

    try:
        model.assert_additive_compatibility(previous_version="digital-twin.v1", next_schema=breaking)
    except DigitalTwinGovernanceError as exc:
        assert "field_type" in str(exc)
    else:
        raise AssertionError("expected DigitalTwinGovernanceError")


def test_projection_tags_sensor_origin_governance_and_access():
    model = DigitalTwinReadinessModel()
    model.register_schema(build_schema("digital-twin.v1"))

    event = build_event()
    batch = TelemetryIngestionBatch(
        api_version="telemetry-ingest.v1",
        session_id="session-049",
        batch_index=0,
        idempotency_key="idem-049-0",
        received_at="2026-04-13T11:10:05Z",
        events=(event,),
    )
    receipt = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T11:10:07Z").ingest(batch)
    [route] = EventBusTopicPartitioningModel().plan_routes(batch=batch, receipt=receipt)

    projection = model.project_sensor_state(
        event=event,
        route=route,
        schema_version="digital-twin.v1",
        last_reconciled_at="2026-04-13T11:10:10Z",
        derived_health_score=0.82,
    )

    assert projection.data_class == TwinDataClass.SENSOR_ORIGIN
    assert projection.governance_boundary == "sensor-origin-vs-user-entered"
    assert projection.retention_days == 365
    assert projection.data_check_id == "IOTDI-005"

    model.assert_access(
        projection=projection,
        action=TwinGovernanceAction.MODEL_USE,
        actor_role="analytics",
    )

    try:
        model.assert_access(
            projection=projection,
            action=TwinGovernanceAction.WRITE,
            actor_role="finance_ops",
        )
    except DigitalTwinGovernanceError as exc:
        assert "not allowed" in str(exc)
    else:
        raise AssertionError("expected DigitalTwinGovernanceError")


def test_hardware_actions_remain_deferred():
    model = DigitalTwinReadinessModel()

    try:
        model.assert_hardware_deferred("firmware_push", country_code="GH")
    except DigitalTwinGovernanceError as exc:
        assert "deferred" in str(exc)
    else:
        raise AssertionError("expected DigitalTwinGovernanceError")
