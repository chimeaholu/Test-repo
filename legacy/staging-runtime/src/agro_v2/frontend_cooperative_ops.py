"""F-019 cooperative operations route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .frontend_home_queues import HomeQueueTask
from .frontend_listing_routes import ListingCard
from .frontend_traceability_routes import TraceabilityTimelineSurface


class FrontendCooperativeOpsError(ValueError):
    """Raised when cooperative operations surfaces lose queue or dispatch coverage."""


@dataclass(frozen=True)
class CooperativeMemberTask:
    task_id: str
    title: str
    member_id: str
    route: str


@dataclass(frozen=True)
class CooperativeDispatchRow:
    consignment_id: str
    latest_stage: str
    evidence_count: int
    route: str


@dataclass(frozen=True)
class CooperativeOperationsSurface:
    members_route: str
    quality_route: str
    dispatch_route: str
    bulk_listing_route: str
    member_tasks: tuple[CooperativeMemberTask, ...]
    listing_cards: tuple[ListingCard, ...]
    dispatch_rows: tuple[CooperativeDispatchRow, ...]


@dataclass(frozen=True)
class CooperativeOpsAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendCooperativeOperations:
    """Composes cooperative member, quality, dispatch, and bulk-listing work surfaces."""

    def build_surface(
        self,
        *,
        queue_tasks: tuple[HomeQueueTask, ...],
        listing_cards: tuple[ListingCard, ...],
        traceability_surfaces: tuple[TraceabilityTimelineSurface, ...],
    ) -> CooperativeOperationsSurface:
        return CooperativeOperationsSurface(
            members_route="/app/cooperative/members",
            quality_route="/app/cooperative/quality",
            dispatch_route="/app/cooperative/dispatch",
            bulk_listing_route="/app/cooperative/bulk-listings",
            member_tasks=tuple(
                CooperativeMemberTask(
                    task_id=task.task_id,
                    title=task.title,
                    member_id=task.task_id.split("-", 1)[0],
                    route=task.route,
                )
                for task in sorted(queue_tasks, key=lambda item: (item.priority_rank, item.task_id))
            ),
            listing_cards=listing_cards,
            dispatch_rows=tuple(
                CooperativeDispatchRow(
                    consignment_id=surface.consignment_id,
                    latest_stage=surface.entries[-1].event_type,
                    evidence_count=surface.total_evidence_count,
                    route=surface.timeline_route,
                )
                for surface in sorted(traceability_surfaces, key=lambda item: item.consignment_id)
                if surface.entries
            ),
        )

    def audit(self, surface: CooperativeOperationsSurface) -> CooperativeOpsAudit:
        issues: list[str] = []
        if not surface.member_tasks:
            issues.append("member_tasks_missing")
        if not surface.listing_cards:
            issues.append("listing_cards_missing")
        if not surface.dispatch_rows:
            issues.append("dispatch_rows_missing")
        return CooperativeOpsAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="co-op-queue-and-quality-tests",
            ux_data_check_id="F-019",
        )
