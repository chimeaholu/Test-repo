from agro_v2.device_registry import (
    DeviceClass,
    DeviceIdentity,
    DeviceRegistryError,
    DeviceRegistryRecord,
    DeviceRegistryService,
    DeviceStatus,
    DeviceStatusChange,
)
from agro_v2.state_store import CanonicalStateStore


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


def test_registry_record_defaults_lineage_root_to_device_id():
    record = build_record(lineage_root_id="")

    assert record.lineage_root_id == record.device_id


def test_identity_lifecycle_allows_activate_suspend_and_retire():
    service = DeviceRegistryService()
    service.register(build_record())

    activated = service.transition(
        device_id="device-045-1",
        next_status=DeviceStatus.ACTIVE,
        changed_at="2026-04-13T08:05:00Z",
        reason="field_installation_complete",
        actor_id="ops-045",
    )
    suspended = service.transition(
        device_id="device-045-1",
        next_status=DeviceStatus.SUSPENDED,
        changed_at="2026-04-13T08:10:00Z",
        reason="battery_swap_pending",
        actor_id="ops-045",
    )
    retired = service.transition(
        device_id="device-045-1",
        next_status=DeviceStatus.RETIRED,
        changed_at="2026-04-13T08:15:00Z",
        reason="hardware_replaced",
        actor_id="ops-045",
    )

    assert activated.status == DeviceStatus.ACTIVE
    assert suspended.status == DeviceStatus.SUSPENDED
    assert retired.status == DeviceStatus.RETIRED
    assert [item.next_status for item in retired.status_history] == [
        DeviceStatus.PROVISIONED,
        DeviceStatus.ACTIVE,
        DeviceStatus.SUSPENDED,
        DeviceStatus.RETIRED,
    ]


def test_retired_device_cannot_reenter_active_lifecycle():
    service = DeviceRegistryService()
    service.register(
        build_record(
            status=DeviceStatus.RETIRED,
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
                    next_status=DeviceStatus.RETIRED,
                    changed_at="2026-04-13T08:30:00Z",
                    reason="revoked",
                    actor_id="ops-045",
                ),
            ),
        )
    )

    try:
        service.transition(
            device_id="device-045-1",
            next_status=DeviceStatus.ACTIVE,
            changed_at="2026-04-13T08:45:00Z",
            reason="attempted_reactivation",
            actor_id="ops-045",
        )
    except DeviceRegistryError as exc:
        assert "invalid lifecycle transition" in str(exc)
    else:
        raise AssertionError("expected DeviceRegistryError")


def test_workflow_command_persists_lineage_and_status_history():
    store = CanonicalStateStore()
    service = DeviceRegistryService()
    record = service.register(build_record())
    updated = service.transition(
        device_id=record.device_id,
        next_status=DeviceStatus.ACTIVE,
        changed_at="2026-04-13T08:05:00Z",
        reason="field_installation_complete",
        actor_id="ops-045",
    )

    store.apply(
        updated.to_workflow_command(
            workflow_id="iot-device:farm-045:device-045-1",
            idempotency_key="device-045-activate",
        )
    )
    snapshot = store.snapshot("iot-device:farm-045:device-045-1")

    assert snapshot.state["device_registry"]["lineage_root_id"] == "device-045-1"
    assert snapshot.state["device_registry"]["status"] == "active"
    assert snapshot.state["device_registry"]["status_history"][-1]["reason"] == "field_installation_complete"
