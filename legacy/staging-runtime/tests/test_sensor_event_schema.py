from agro_v2.device_registry import (
    DeviceClass,
    DeviceIdentity,
    DeviceRegistryRecord,
    DeviceStatus,
    DeviceStatusChange,
)
from agro_v2.sensor_event_schema import (
    SensorEventContract,
    SensorEventProvenance,
    SensorEventSchemaError,
    SensorEventType,
    SensorTransport,
)


def build_record(**overrides) -> DeviceRegistryRecord:
    payload = {
        "device_id": "device-045-1",
        "farm_id": "farm-045",
        "country_code": "GH",
        "registry_version": "device-registry.v1",
        "device_class": DeviceClass.SENSOR_NODE,
        "identity": DeviceIdentity(
            hardware_serial="SN-045-001",
            hardware_fingerprint="fp-045-001",
            manufacturer="AgroNode",
            model="AN-Soil-2",
            firmware_version="2.3.1",
            network_address="10.0.0.15",
        ),
        "status": DeviceStatus.PROVISIONED,
        "registered_at": "2026-04-13T08:00:00Z",
        "owner_subject_id": "coop-045",
        "status_history": (
            DeviceStatusChange(
                previous_status=None,
                next_status=DeviceStatus.PROVISIONED,
                changed_at="2026-04-13T08:00:00Z",
                reason="factory_onboarded",
                actor_id="ops-045",
            ),
        ),
    }
    payload.update(overrides)
    return DeviceRegistryRecord(**payload)


def build_active_record():
    return build_record(
        status=DeviceStatus.ACTIVE,
        status_history=(
            DeviceStatusChange(
                previous_status=None,
                next_status=DeviceStatus.PROVISIONED,
                changed_at="2026-04-13T08:00:00Z",
                reason="factory_onboarded",
                actor_id="ops-045",
            ),
            DeviceStatusChange(
                previous_status=DeviceStatus.PROVISIONED,
                next_status=DeviceStatus.ACTIVE,
                changed_at="2026-04-13T08:05:00Z",
                reason="field_installation_complete",
                actor_id="ops-045",
            ),
        ),
    )


def build_provenance(**overrides) -> SensorEventProvenance:
    payload = {
        "source_message_id": "msg-046-1",
        "source_provider": "edge-gateway",
        "transport": SensorTransport.MQTT,
        "collected_at": "2026-04-13T09:00:00Z",
        "received_at": "2026-04-13T09:00:02Z",
        "signature": "sig-046-1",
        "signer_id": "gateway-045-1",
        "confidence": 0.98,
        "firmware_version": "2.3.1",
        "trace_id": "trace-046-1",
        "chain_of_custody": ("sensor-node", "gateway", "edge-ingest"),
    }
    payload.update(overrides)
    return SensorEventProvenance(**payload)


def test_sensor_event_envelope_carries_registry_lineage_and_provenance():
    contract = SensorEventContract()
    device = build_active_record()

    event = contract.issue_event(
        device=device,
        event_id="evt-046-1",
        event_type=SensorEventType.SOIL_MOISTURE,
        observed_at="2026-04-13T09:00:00Z",
        payload={"value": 0.22, "depth_cm": 10},
        unit="ratio",
        provenance=build_provenance(),
    )

    assert event.lineage_root_id == device.device_id
    assert event.registry_version == "device-registry.v1"
    assert event.provenance_projection()["confidence"] == 0.98
    assert event.dedupe_key == "device-045-1:soil_moisture:2026-04-13T09:00:00Z:msg-046-1"


def test_contract_rejects_non_active_devices():
    contract = SensorEventContract()

    try:
        contract.issue_event(
            device=build_record(
                status=DeviceStatus.SUSPENDED,
                status_history=(
                    DeviceStatusChange(
                        previous_status=None,
                        next_status=DeviceStatus.PROVISIONED,
                        changed_at="2026-04-13T08:00:00Z",
                        reason="factory_onboarded",
                        actor_id="ops-045",
                    ),
                    DeviceStatusChange(
                        previous_status=DeviceStatus.PROVISIONED,
                        next_status=DeviceStatus.SUSPENDED,
                        changed_at="2026-04-13T08:04:00Z",
                        reason="field_hold",
                        actor_id="ops-045",
                    ),
                ),
            ),
            event_id="evt-046-2",
            event_type=SensorEventType.TEMPERATURE,
            observed_at="2026-04-13T09:05:00Z",
            payload={"value": 31.5},
            unit="c",
            provenance=build_provenance(source_message_id="msg-046-2"),
        )
    except SensorEventSchemaError as exc:
        assert "active" in str(exc)
    else:
        raise AssertionError("expected SensorEventSchemaError")


def test_contract_rejects_registry_and_firmware_mismatches():
    contract = SensorEventContract()
    device = build_active_record()
    event = contract.issue_event(
        device=device,
        event_id="evt-046-3",
        event_type=SensorEventType.RAINFALL,
        observed_at="2026-04-13T09:10:00Z",
        payload={"value": 12.4},
        unit="mm",
        provenance=build_provenance(
            source_message_id="msg-046-3",
            firmware_version="9.9.9",
        ),
    )

    try:
        contract.validate_against_registry(event=event, device=device)
    except SensorEventSchemaError as exc:
        assert "firmware_version" in str(exc)
    else:
        raise AssertionError("expected SensorEventSchemaError")


def test_provenance_requires_signature_confidence_and_chain_of_custody():
    try:
        build_provenance(signature=" ", chain_of_custody=())
    except SensorEventSchemaError as exc:
        assert "signature" in str(exc) or "chain_of_custody" in str(exc)
    else:
        raise AssertionError("expected SensorEventSchemaError")
