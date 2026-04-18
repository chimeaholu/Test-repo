"""F-014 finance queue and decision detail route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .finance_hitl_console import ApprovalConsoleSnapshot, ApprovalQueueItem, ApprovalState
from .finance_partner_adapter import FinancePartnerDecisionResponse
from .frontend_app_shell import AppRole, AppShellSnapshot
from .insurance_trigger_registry import ParametricPayoutEvent


class FrontendFinanceQueueError(ValueError):
    """Raised when finance review surfaces break role or evidence expectations."""


@dataclass(frozen=True)
class FinanceQueueListItem:
    item_id: str
    summary: str
    amount_label: str
    status: ApprovalState
    detail_route: str
    evidence_count: int
    risk_score: int


@dataclass(frozen=True)
class FinanceQueueSurface:
    queue_route: str
    visible_items: tuple[FinanceQueueListItem, ...]
    pending_count: int
    in_review_count: int
    resolved_count: int


@dataclass(frozen=True)
class FinanceDecisionDetailSurface:
    item_id: str
    headline: str
    detail_route: str
    status: ApprovalState
    amount_label: str
    responsibility_rows: tuple[tuple[str, str], ...]
    evidence_reference_ids: tuple[str, ...]
    action_log: tuple[str, ...]


@dataclass(frozen=True)
class FinanceQueueAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendFinanceQueue:
    """Projects finance review work into queue and decision-detail surfaces."""

    def build_queue(
        self,
        *,
        shell_snapshot: AppShellSnapshot,
        console_snapshot: ApprovalConsoleSnapshot,
    ) -> FinanceQueueSurface:
        if shell_snapshot.role != AppRole.FINANCE:
            raise FrontendFinanceQueueError("finance queue requires finance role shell snapshot")
        visible_items = tuple(
            self._list_item_for(item) for item in sorted(
                console_snapshot.visible_items,
                key=lambda item: (item.status != ApprovalState.PENDING, -item.risk_score, item.item_id),
            )
        )
        return FinanceQueueSurface(
            queue_route="/app/finance/queue",
            visible_items=visible_items,
            pending_count=console_snapshot.pending_items,
            in_review_count=console_snapshot.in_review_items,
            resolved_count=console_snapshot.resolved_items,
        )

    def build_detail(
        self,
        *,
        item: ApprovalQueueItem,
        decision: FinancePartnerDecisionResponse | None = None,
        payout_event: ParametricPayoutEvent | None = None,
    ) -> FinanceDecisionDetailSurface:
        if decision is None and payout_event is None:
            raise FrontendFinanceQueueError("decision or payout_event is required")
        if decision is not None and payout_event is not None:
            raise FrontendFinanceQueueError("detail surface accepts one source at a time")

        responsibility_rows: tuple[tuple[str, str], ...]
        if decision is not None:
            responsibility_rows = (
                ("Liability owner", decision.responsibility_boundary.liability_owner),
                (
                    "Platform responsibilities",
                    ", ".join(decision.responsibility_boundary.platform_responsibilities),
                ),
                (
                    "Partner responsibilities",
                    ", ".join(decision.responsibility_boundary.partner_responsibilities),
                ),
                ("Dispute path", decision.responsibility_boundary.dispute_path),
            )
            headline = f"{decision.decision_type.value.title()} review for {decision.product_code}"
        else:
            assert payout_event is not None
            responsibility_rows = (
                ("Trigger id", payout_event.trigger_id),
                ("Source reference", payout_event.source_reference),
                ("Metric", payout_event.metric_name),
                ("Observed vs threshold", f"{payout_event.observed_value} / {payout_event.threshold_value}"),
            )
            headline = f"Payout review for {payout_event.product_code}"

        return FinanceDecisionDetailSurface(
            item_id=item.item_id,
            headline=headline,
            detail_route=f"/app/finance/queue/{item.item_id}",
            status=item.status,
            amount_label=_format_minor(item.amount_minor, item.currency),
            responsibility_rows=responsibility_rows,
            evidence_reference_ids=item.evidence_reference_ids,
            action_log=tuple(
                f"{action.occurred_at} {action.actor_id} {action.action}"
                for action in item.actions
            ),
        )

    def audit(
        self,
        *,
        queue_surface: FinanceQueueSurface,
        detail_surface: FinanceDecisionDetailSurface,
    ) -> FinanceQueueAudit:
        issues: list[str] = []
        if not queue_surface.visible_items:
            issues.append("finance_queue_empty")
        if detail_surface.item_id not in tuple(item.item_id for item in queue_surface.visible_items):
            issues.append("detail_missing_from_queue")
        if not detail_surface.evidence_reference_ids:
            issues.append("evidence_missing")
        if not detail_surface.responsibility_rows:
            issues.append("responsibility_boundary_missing")
        return FinanceQueueAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C07",
            ux_data_check_id="F-014",
        )

    @staticmethod
    def _list_item_for(item: ApprovalQueueItem) -> FinanceQueueListItem:
        return FinanceQueueListItem(
            item_id=item.item_id,
            summary=item.summary,
            amount_label=_format_minor(item.amount_minor, item.currency),
            status=item.status,
            detail_route=f"/app/finance/queue/{item.item_id}",
            evidence_count=len(item.evidence_reference_ids),
            risk_score=item.risk_score,
        )


def _format_minor(amount_minor: int, currency: str) -> str:
    return f"{currency} {amount_minor / 100:.2f}"
