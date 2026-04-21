from agro_v2.sensor_event_schema import (
    SensorEventContract,
    SensorEventProvenance,
    SensorEventType,
    SensorTransport,
)
from agro_v2.device_registry import (
    DeviceClass,
    DeviceIdentity,
    DeviceRegistryRecord,
    DeviceStatus,
    DeviceStatusChange,
)
from agro_v2.telemetry_ingestion_api import (
    TelemetryIngestionApiError,
    TelemetryIngestionApiProfile,
    TelemetryIngestionBatch,
    TelemetryResumeToken,
)
from agro_v2.tool_contracts import ToolContractRegistry


def build_active_record() -> DeviceRegistryRecord:
    return DeviceRegistryRecord(
        device_id="device-045-1",
        farm_id="farm-045",
        country_code="GH",
        registry_version="device-registry.v1",
        device_class=DeviceClass.SENSOR_NODE,
        identity=DeviceIdentity(
            hardware_serial="SN-045-001",
            hardware_fingerprint="fp-045-001",
            manufacturer="AgroNode",
            model="AN-Soil-2",
            firmware_version="2.3.1",
            network_address="10.0.0.15",
        ),
        status=DeviceStatus.ACTIVE,
        registered_at="2026-04-13T08:00:00Z",
        owner_subject_id="coop-045",
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
        "source_message_id": "msg-047-1",
        "source_provider": "edge-gateway",
        "transport": SensorTransport.HTTP,
        "collected_at": "2026-04-13T09:15:00Z",
        "received_at": "2026-04-13T09:15:03Z",
        "signature": "sig-047-1",
        "signer_id": "gateway-047-1",
        "confidence": 0.97,
        "firmware_version": "2.3.1",
        "trace_id": "trace-047-1",
        "chain_of_custody": ("sensor-node", "gateway", "telemetry-api"),
    }
    payload.update(overrides)
    return SensorEventProvenance(**payload)


def build_event(*, event_id: str, source_message_id: str, observed_at: str):
    contract = SensorEventContract()
    return contract.issue_event(
        device=build_active_record(),
        event_id=event_id,
        event_type=SensorEventType.SOIL_MOISTURE,
        observed_at=observed_at,
        payload={"value": 0.24, "depth_cm": 10},
        unit="ratio",
        provenance=build_provenance(
            source_message_id=source_message_id,
            trace_id=f"trace-{event_id}",
        ),
    )


def build_batch(**overrides) -> TelemetryIngestionBatch:
    payload = {
        "api_version": "telemetry-ingest.v1",
        "session_id": "session-047-1",
        "batch_index": 0,
        "idempotency_key": "ingest-047-1",
        "received_at": "2026-04-13T09:15:05Z",
        "events": (
            build_event(
                event_id="evt-047-1",
                source_message_id="msg-047-1",
                observed_at="2026-04-13T09:15:00Z",
            ),
        ),
    }
    payload.update(overrides)
    return TelemetryIngestionBatch(**payload)


def test_first_batch_accepts_events_and_issues_resume_token():
    profile = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T09:15:10Z")

    receipt = profile.ingest(build_batch())

    assert receipt.accepted_event_ids == ("evt-047-1",)
    assert receipt.duplicate_event_ids == ()
    assert receipt.effective_event_count == 1
    assert receipt.session_status == "open"
    assert receipt.next_resume_token is not None
    assert receipt.next_resume_token.next_batch_index == 1


def test_ingest_replays_identical_idempotency_key_without_mutating_state():
    profile = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T09:15:10Z")
    batch = build_batch()

    first = profile.ingest(batch)
    replay = profile.ingest(batch)

    assert replay == first
    assert replay.effective_event_count == 1


def test_resume_token_is_required_and_validated_for_follow_on_batches():
    profile = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T09:15:10Z")
    first = profile.ingest(build_batch())

    try:
        profile.ingest(
            build_batch(
                batch_index=1,
                idempotency_key="ingest-047-2",
                received_at="2026-04-13T09:16:05Z",
                events=(
                    build_event(
                        event_id="evt-047-2",
                        source_message_id="msg-047-2",
                        observed_at="2026-04-13T09:16:00Z",
                    ),
                ),
                resume_token=TelemetryResumeToken(
                    session_id="wrong-session",
                    device_id="device-045-1",
                    farm_id="farm-045",
                    api_version="telemetry-ingest.v1",
                    next_batch_index=1,
                    issued_at="2026-04-13T09:15:10Z",
                ),
            )
        )
    except TelemetryIngestionApiError as exc:
        assert "session_id mismatch" in str(exc)
    else:
        raise AssertionError("expected TelemetryIngestionApiError")

    second = profile.ingest(
        build_batch(
            batch_index=1,
            idempotency_key="ingest-047-3",
            received_at="2026-04-13T09:16:05Z",
            events=(
                build_event(
                    event_id="evt-047-2",
                    source_message_id="msg-047-2",
                    observed_at="2026-04-13T09:16:00Z",
                ),
            ),
            resume_token=first.next_resume_token,
            final_batch=True,
        )
    )

    assert second.accepted_event_ids == ("evt-047-2",)
    assert second.session_status == "complete"
    assert second.next_resume_token is None


def test_duplicate_event_is_suppressed_across_resumed_batches():
    profile = TelemetryIngestionApiProfile(clock=lambda: "2026-04-13T09:15:10Z")
    first = profile.ingest(build_batch())
    duplicate_event = build_event(
        event_id="evt-047-1-duplicate",
        source_message_id="msg-047-1",
        observed_at="2026-04-13T09:15:00Z",
    )

    receipt = profile.ingest(
        build_batch(
            batch_index=1,
            idempotency_key="ingest-047-4",
            received_at="2026-04-13T09:16:30Z",
            events=(duplicate_event,),
            resume_token=first.next_resume_token,
            final_batch=True,
        )
    )

    assert receipt.accepted_event_ids == ()
    assert receipt.duplicate_event_ids == ("evt-047-1-duplicate",)
    assert receipt.effective_event_count == 1


def test_profile_registers_default_tool_contract():
    registry = ToolContractRegistry()
    profile = TelemetryIngestionApiProfile(
        contract_registry=registry,
        clock=lambda: "2026-04-13T09:15:10Z",
    )

    receipt = profile.ingest(build_batch())

    contract = registry.get("telemetry.ingest_batch", "telemetry-ingest.v1")
    assert contract.tool_name == "telemetry.ingest_batch"
    assert receipt.next_resume_token is not None
