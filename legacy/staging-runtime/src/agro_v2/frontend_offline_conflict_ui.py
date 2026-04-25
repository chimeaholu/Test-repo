"""F-017 offline outbox and conflict resolver route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .offline_action_queue import OfflineAction, OfflineActionStatus
from .sync_conflict_resolver import SyncConflictResolution


class FrontendOfflineConflictError(ValueError):
    """Raised when queued-write or conflict-resolution surfaces are incomplete."""


@dataclass(frozen=True)
class OutboxItem:
    operation_id: str
    operation_name: str
    status: OfflineActionStatus
    detail_route: str
    helper_text: str


@dataclass(frozen=True)
class ConflictDetailSurface:
    operation_id: str
    detail_route: str
    resolution_policy: str
    user_state: str
    client_action: str
    requires_user_action: bool


@dataclass(frozen=True)
class OfflineOutboxSurface:
    outbox_route: str
    items: tuple[OutboxItem, ...]
    conflict_details: tuple[ConflictDetailSurface, ...]


@dataclass(frozen=True)
class OfflineConflictAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendOfflineConflictUi:
    """Projects queued writes and conflict decisions into recoverable route surfaces."""

    def build_surface(
        self,
        *,
        actions: tuple[OfflineAction, ...],
        resolutions: tuple[SyncConflictResolution, ...] = (),
    ) -> OfflineOutboxSurface:
        return OfflineOutboxSurface(
            outbox_route="/app/offline/outbox",
            items=tuple(self._item_for(action) for action in sorted(actions, key=lambda item: item.operation_id)),
            conflict_details=tuple(
                self._detail_for(resolution) for resolution in sorted(
                    resolutions,
                    key=lambda item: item.operation_id,
                )
            ),
        )

    def audit(self, surface: OfflineOutboxSurface) -> OfflineConflictAudit:
        issues: list[str] = []
        if not surface.items:
            issues.append("offline_outbox_empty")
        for detail in surface.conflict_details:
            if detail.operation_id not in tuple(item.operation_id for item in surface.items):
                issues.append("conflict_without_outbox_item")
                break
        conflicted_ids = {
            item.operation_id for item in surface.items if item.status == OfflineActionStatus.CONFLICTED
        }
        if conflicted_ids and not conflicted_ids.issubset(
            {detail.operation_id for detail in surface.conflict_details}
        ):
            issues.append("conflict_detail_missing")
        return OfflineConflictAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-D02",
            ux_data_check_id="F-017",
        )

    @staticmethod
    def _item_for(action: OfflineAction) -> OutboxItem:
        helper = {
            OfflineActionStatus.QUEUED: "Waiting for replay",
            OfflineActionStatus.REPLAYING: "Replaying now",
            OfflineActionStatus.SYNCED: "Applied",
            OfflineActionStatus.FAILED_RETRYABLE: "Retry scheduled",
            OfflineActionStatus.FAILED_TERMINAL: "Needs support",
            OfflineActionStatus.CONFLICTED: "Resolve conflict",
        }[action.status]
        route = (
            f"/app/offline/conflicts/{action.operation_id}"
            if action.status == OfflineActionStatus.CONFLICTED
            else f"/app/offline/outbox#{action.operation_id}"
        )
        return OutboxItem(
            operation_id=action.operation_id,
            operation_name=action.operation_name,
            status=action.status,
            detail_route=route,
            helper_text=helper,
        )

    @staticmethod
    def _detail_for(resolution: SyncConflictResolution) -> ConflictDetailSurface:
        return ConflictDetailSurface(
            operation_id=resolution.operation_id,
            detail_route=f"/app/offline/conflicts/{resolution.operation_id}",
            resolution_policy=resolution.resolution_policy.value,
            user_state=resolution.user_state.value,
            client_action=resolution.client_action.value,
            requires_user_action=resolution.requires_user_action,
        )
