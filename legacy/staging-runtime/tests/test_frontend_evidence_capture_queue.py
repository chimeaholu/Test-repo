from agro_v2.device_capability_layer import (
    CapabilityAvailability,
    CapabilityType,
    DeviceCapabilityAbstractionLayer,
    DeviceCapabilityAdapter,
    DeviceCapabilityContract,
    DeviceCapabilityRequest,
    PermissionState,
)
from agro_v2.frontend_evidence_capture_queue import (
    EvidenceUploadQueueItem,
    FrontendEvidenceCaptureQueue,
)
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
    ResumableOperation,
)


def build_layer():
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="mobile.v1",
            payload_budgets=(
                PayloadBudget("device.camera.capture", 2048),
                PayloadBudget("device.storage.pick", 2048),
            ),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(ResumableOperation("evidence.upload", token_ttl_seconds=3600),),
        )
    )
    layer = DeviceCapabilityAbstractionLayer(profile_registry=registry)
    layer.register_contract(
        DeviceCapabilityContract(
            capability=CapabilityType.CAMERA,
            domain_boundary="traceability",
            telemetry_event="camera.capture",
            profile_endpoint="device.camera.capture",
        )
    )
    layer.register_contract(
        DeviceCapabilityContract(
            capability=CapabilityType.STORAGE,
            domain_boundary="traceability",
            telemetry_event="storage.pick",
            profile_endpoint="device.storage.pick",
        )
    )
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="cam-16",
            capability=CapabilityType.CAMERA,
            implementation="android.camera",
            availability=CapabilityAvailability.AVAILABLE,
        )
    )
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="store-16",
            capability=CapabilityType.STORAGE,
            implementation="android.storage",
            availability=CapabilityAvailability.DEGRADED,
            permission_state=PermissionState.GRANTED,
        )
    )
    return layer


def test_evidence_capture_surface_projects_capability_modes_and_queue():
    layer = build_layer()
    camera_plan = layer.plan(
        DeviceCapabilityRequest(
            capability=CapabilityType.CAMERA,
            adapter_id="cam-16",
            domain_action="capture_evidence",
            profile_version="mobile.v1",
            trace_id="trace-16",
            payload={"capture": "image"},
        )
    )
    file_plan = layer.plan(
        DeviceCapabilityRequest(
            capability=CapabilityType.STORAGE,
            adapter_id="store-16",
            domain_action="upload_evidence",
            profile_version="mobile.v1",
            trace_id="trace-17",
            payload={"pick": "pdf"},
            allow_degraded=True,
        )
    )
    surface = FrontendEvidenceCaptureQueue().build_surface(
        consignment_id="cons-16",
        camera_plan=camera_plan,
        file_plan=file_plan,
        upload_queue=(
            EvidenceUploadQueueItem(
                upload_id="up-16",
                file_name="lab-report.pdf",
                queue_state="queued",
                retry_route="/app/traceability/cons-16/evidence#up-16",
            ),
        ),
    )
    audit = FrontendEvidenceCaptureQueue().audit(surface)

    assert [method.execution_mode.value for method in surface.methods] == ["direct", "degraded"]
    assert audit.passed is True
