"""F-016 evidence capture and upload queue contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .device_capability_layer import CapabilityExecutionPlan, ExecutionMode


class FrontendEvidenceCaptureError(ValueError):
    """Raised when evidence capture routes lose capability or queue coverage."""


@dataclass(frozen=True)
class CaptureMethodOption:
    label: str
    execution_mode: ExecutionMode
    helper_text: str


@dataclass(frozen=True)
class EvidenceUploadQueueItem:
    upload_id: str
    file_name: str
    queue_state: str
    retry_route: str


@dataclass(frozen=True)
class EvidenceCaptureSurface:
    capture_route: str
    methods: tuple[CaptureMethodOption, ...]
    upload_queue: tuple[EvidenceUploadQueueItem, ...]
    primary_route: str


@dataclass(frozen=True)
class EvidenceCaptureAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendEvidenceCaptureQueue:
    """Builds capture and queued-upload surfaces from device capability plans."""

    def build_surface(
        self,
        *,
        consignment_id: str,
        camera_plan: CapabilityExecutionPlan,
        file_plan: CapabilityExecutionPlan,
        upload_queue: tuple[EvidenceUploadQueueItem, ...] = (),
    ) -> EvidenceCaptureSurface:
        methods = (
            self._method_for("Take photo", camera_plan),
            self._method_for("Upload file", file_plan),
        )
        return EvidenceCaptureSurface(
            capture_route=f"/app/traceability/{consignment_id}/evidence/new",
            methods=methods,
            upload_queue=tuple(sorted(upload_queue, key=lambda item: item.upload_id)),
            primary_route=f"/app/traceability/{consignment_id}/evidence",
        )

    def audit(self, surface: EvidenceCaptureSurface) -> EvidenceCaptureAudit:
        issues: list[str] = []
        if all(method.execution_mode == ExecutionMode.BLOCKED for method in surface.methods):
            issues.append("all_capture_methods_blocked")
        if not surface.capture_route.endswith("/evidence/new"):
            issues.append("capture_route_missing")
        for item in surface.upload_queue:
            if not item.retry_route.startswith("/app/traceability/"):
                issues.append("upload_retry_route_invalid")
                break
        return EvidenceCaptureAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-E06",
            ux_data_check_id="F-016",
        )

    @staticmethod
    def _method_for(label: str, plan: CapabilityExecutionPlan) -> CaptureMethodOption:
        helper = {
            ExecutionMode.DIRECT: "Ready now",
            ExecutionMode.DEGRADED: f"Use limited mode: {plan.fallback_reason}",
            ExecutionMode.DEFERRED: f"Queued until full capability returns: {plan.fallback_reason}",
            ExecutionMode.BLOCKED: f"Needs recovery: {plan.fallback_reason}",
        }[plan.execution_mode]
        return CaptureMethodOption(
            label=label,
            execution_mode=plan.execution_mode,
            helper_text=helper,
        )
