import pytest

from agro_v2.device_capability_layer import (
    CapabilityAvailability,
    CapabilityType,
    DeviceCapabilityAbstractionLayer,
    DeviceCapabilityAdapter,
    DeviceCapabilityContract,
    DeviceCapabilityError,
    DeviceCapabilityRequest,
    ExecutionMode,
    PermissionState,
)
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
)


def build_registry() -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="2026-04-13",
            payload_budgets=(
                PayloadBudget("device.camera.capture", max_bytes=120),
                PayloadBudget("device.background.sync", max_bytes=160),
            ),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(),
        )
    )
    return registry


def build_layer() -> DeviceCapabilityAbstractionLayer:
    layer = DeviceCapabilityAbstractionLayer(profile_registry=build_registry())
    layer.register_contract(
        DeviceCapabilityContract(
            capability=CapabilityType.CAMERA,
            domain_boundary="listing_media",
            telemetry_event="capability.camera.path",
            profile_endpoint="device.camera.capture",
        )
    )
    layer.register_contract(
        DeviceCapabilityContract(
            capability=CapabilityType.BACKGROUND_JOB,
            domain_boundary="offline_sync",
            telemetry_event="capability.background.path",
            profile_endpoint="device.background.sync",
            background_safe=True,
        )
    )
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="camera-native",
            capability=CapabilityType.CAMERA,
            implementation="native_camera_v1",
            availability=CapabilityAvailability.AVAILABLE,
        )
    )
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="camera-web-fallback",
            capability=CapabilityType.CAMERA,
            implementation="web_upload_fallback",
            availability=CapabilityAvailability.DEGRADED,
        )
    )
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="bg-sync-worker",
            capability=CapabilityType.BACKGROUND_JOB,
            implementation="android_work_manager",
            availability=CapabilityAvailability.AVAILABLE,
            supports_background=True,
        )
    )
    return layer


def test_capability_contract_accepts_compatible_adapter_and_preserves_domain_action():
    layer = build_layer()

    plan = layer.plan(
        DeviceCapabilityRequest(
            capability=CapabilityType.CAMERA,
            adapter_id="camera-native",
            domain_action="attach_listing_photo",
            profile_version="2026-04-13",
            trace_id="trace-42-1",
            payload={"bytes": "x" * 20},
        )
    )

    assert plan.execution_mode == ExecutionMode.DIRECT
    assert plan.domain_action == "attach_listing_photo"
    assert plan.telemetry_record.domain_action == "attach_listing_photo"
    assert plan.telemetry_record.capability_path == "camera:native_camera_v1"


def test_capability_layer_degrades_without_changing_domain_contract():
    layer = build_layer()

    plan = layer.plan(
        DeviceCapabilityRequest(
            capability=CapabilityType.CAMERA,
            adapter_id="camera-web-fallback",
            domain_action="attach_listing_photo",
            profile_version="2026-04-13",
            trace_id="trace-42-2",
            payload={"bytes": "x" * 20},
            allow_degraded=True,
        )
    )

    assert plan.execution_mode == ExecutionMode.DEGRADED
    assert plan.domain_action == "attach_listing_photo"
    assert plan.fallback_reason == "degraded_capability"
    assert plan.telemetry_record.capability_path == "camera:web_upload_fallback"


def test_background_contract_requires_background_safe_adapter():
    layer = build_layer()
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="bg-sync-foreground-only",
            capability=CapabilityType.BACKGROUND_JOB,
            implementation="foreground_retry_only",
            availability=CapabilityAvailability.AVAILABLE,
            supports_background=False,
        )
    )

    with pytest.raises(DeviceCapabilityError, match="background execution contract"):
        layer.assert_compatible(
            capability=CapabilityType.BACKGROUND_JOB,
            adapter_id="bg-sync-foreground-only",
        )


def test_permission_gap_blocks_capability_execution():
    layer = build_layer()
    layer.register_adapter(
        DeviceCapabilityAdapter(
            adapter_id="camera-permission-prompt",
            capability=CapabilityType.CAMERA,
            implementation="native_camera_prompt",
            availability=CapabilityAvailability.AVAILABLE,
            permission_state=PermissionState.PROMPT_REQUIRED,
        )
    )

    plan = layer.plan(
        DeviceCapabilityRequest(
            capability=CapabilityType.CAMERA,
            adapter_id="camera-permission-prompt",
            domain_action="attach_listing_photo",
            profile_version="2026-04-13",
            trace_id="trace-42-3",
            payload={"bytes": "x" * 20},
        )
    )

    assert plan.execution_mode == ExecutionMode.BLOCKED
    assert plan.fallback_reason == "permission_prompt_required"


def test_capability_payload_budget_is_enforced_through_mobile_profile():
    layer = build_layer()

    with pytest.raises(DeviceCapabilityError, match="payload budget exceeded"):
        layer.plan(
            DeviceCapabilityRequest(
                capability=CapabilityType.CAMERA,
                adapter_id="camera-native",
                domain_action="attach_listing_photo",
                profile_version="2026-04-13",
                trace_id="trace-42-4",
                payload={"bytes": "x" * 400},
            )
        )
