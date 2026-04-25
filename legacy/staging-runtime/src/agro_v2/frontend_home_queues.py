"""F-006 farmer and buyer queue-first home surfaces."""

from __future__ import annotations

from dataclasses import dataclass

from .frontend_app_shell import AppRole, AppShellSnapshot
from .frontend_state_primitives import FrontendStatePrimitiveLibrary, StatePrimitive
from .interaction_feedback_library import CriticalFlow, InteractionState


class FrontendHomeQueueError(ValueError):
    """Raised when farmer or buyer home queues are incomplete or invalid."""


@dataclass(frozen=True)
class HomeQueueTask:
    task_id: str
    title: str
    route: str
    status_label: str
    priority_rank: int
    proof_count: int = 0

    def __post_init__(self) -> None:
        if not self.task_id.strip():
            raise FrontendHomeQueueError("task_id is required")
        if not self.title.strip():
            raise FrontendHomeQueueError("title is required")
        if not self.route.startswith("/"):
            raise FrontendHomeQueueError("route must start with '/'")
        if not self.status_label.strip():
            raise FrontendHomeQueueError("status_label is required")
        if self.priority_rank <= 0:
            raise FrontendHomeQueueError("priority_rank must be > 0")
        if self.proof_count < 0:
            raise FrontendHomeQueueError("proof_count must be >= 0")


@dataclass(frozen=True)
class HomeQueueSurface:
    role: AppRole
    title: str
    subtitle: str
    home_route: str
    tasks: tuple[HomeQueueTask, ...]
    queue_badge_count: int
    empty_state: StatePrimitive | None
    offline_state: StatePrimitive | None
    proof_total: int


@dataclass(frozen=True)
class HomeQueueAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendHomeQueueBuilder:
    """Projects role-home snapshots into executable farmer and buyer queue surfaces."""

    def __init__(self, *, state_library: FrontendStatePrimitiveLibrary) -> None:
        self._state_library = state_library

    def build_surface(
        self,
        *,
        snapshot: AppShellSnapshot,
        tasks: tuple[HomeQueueTask, ...],
    ) -> HomeQueueSurface:
        if snapshot.role not in {AppRole.FARMER, AppRole.BUYER}:
            raise FrontendHomeQueueError("only farmer and buyer homes are supported")

        ordered_tasks = tuple(sorted(tasks, key=lambda task: (task.priority_rank, task.task_id)))
        empty_state = None
        if not ordered_tasks:
            empty_state = self._state_library.primitive_for(
                flow=self._flow_for(snapshot.role),
                state=self._trust_state_for(snapshot.role),
            )
        offline_state = None
        if snapshot.connectivity_state.value != "online":
            offline_state = self._state_library.primitive_for(
                flow=self._flow_for(snapshot.role),
                state=self._offline_state(),
                connectivity_state=snapshot.connectivity_state,
                queue_depth=len(ordered_tasks),
            )
        return HomeQueueSurface(
            role=snapshot.role,
            title=snapshot.queue_summary.heading,
            subtitle=self._subtitle_for(snapshot.role),
            home_route=snapshot.home_route,
            tasks=ordered_tasks,
            queue_badge_count=len(ordered_tasks),
            empty_state=empty_state,
            offline_state=offline_state,
            proof_total=sum(task.proof_count for task in ordered_tasks),
        )

    def audit_surface(
        self,
        *,
        snapshot: AppShellSnapshot,
        surface: HomeQueueSurface,
    ) -> HomeQueueAudit:
        issues: list[str] = []
        if snapshot.active_route != snapshot.home_route:
            issues.append("home_route_inactive")
        if snapshot.queue_summary.pending_count < 1:
            issues.append("queue_summary_missing")
        if surface.queue_badge_count != len(surface.tasks):
            issues.append("queue_badge_mismatch")
        if surface.tasks:
            ordered = tuple(task.priority_rank for task in surface.tasks)
            if ordered != tuple(sorted(ordered)):
                issues.append("tasks_not_priority_sorted")
        if not surface.tasks and surface.empty_state is None:
            issues.append("empty_state_missing")
        if snapshot.connectivity_state.value != "online" and surface.offline_state is None:
            issues.append("offline_state_missing")
        return HomeQueueAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-R01",
            ux_data_check_id="F-006",
        )

    @staticmethod
    def _flow_for(role: AppRole) -> CriticalFlow:
        return CriticalFlow.LISTING_CREATE if role == AppRole.FARMER else CriticalFlow.NEGOTIATION_REPLY

    @staticmethod
    def _subtitle_for(role: AppRole) -> str:
        if role == AppRole.FARMER:
            return "Finish the next sale-critical steps before buyers go cold."
        return "Decide on open purchase work before the best lots move."

    @staticmethod
    def _trust_state_for(role: AppRole) -> InteractionState:
        return InteractionState.TRUST

    @staticmethod
    def _offline_state() -> InteractionState:
        return InteractionState.OFFLINE
