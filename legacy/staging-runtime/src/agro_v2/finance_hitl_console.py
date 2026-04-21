"""B-022 finance and insurance HITL approval console state machine."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum

from .finance_partner_adapter import FinanceDecisionOutcome, FinancePartnerDecisionResponse
from .insurance_trigger_registry import ParametricPayoutEvent
from .policy_guardrails import (
    AgentPolicyGuardrailEngine,
    PolicyDecision,
    PolicyEvaluationInput,
    RiskLevel,
    ToolPolicyRule,
)


class ApprovalItemType(str, Enum):
    PARTNER_DECISION = "partner_decision"
    PAYOUT_EVENT = "payout_event"


class ApprovalState(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ConsoleViewState(str, Enum):
    EMPTY = "empty"
    READY = "ready"
    FILTERED_EMPTY = "filtered_empty"


class FinanceHitlConsoleError(ValueError):
    """Raised when approval queue actions violate console rules."""


@dataclass(frozen=True)
class ApprovalAction:
    action: str
    actor_id: str
    occurred_at: str
    note: str | None = None

    def __post_init__(self) -> None:
        if not self.action.strip():
            raise FinanceHitlConsoleError("action is required")
        if not self.actor_id.strip():
            raise FinanceHitlConsoleError("actor_id is required")
        if not self.occurred_at.strip():
            raise FinanceHitlConsoleError("occurred_at is required")


@dataclass(frozen=True)
class ApprovalQueueItem:
    item_id: str
    item_type: ApprovalItemType
    source_reference_id: str
    country_code: str
    summary: str
    amount_minor: int
    currency: str
    submitted_at: str
    submitted_by: str
    risk_score: int
    status: ApprovalState
    evidence_reference_ids: tuple[str, ...]
    data_check_id: str
    actions: tuple[ApprovalAction, ...] = ()

    def __post_init__(self) -> None:
        if not self.item_id.strip():
            raise FinanceHitlConsoleError("item_id is required")
        if not self.source_reference_id.strip():
            raise FinanceHitlConsoleError("source_reference_id is required")
        if not self.country_code.strip():
            raise FinanceHitlConsoleError("country_code is required")
        if not self.summary.strip():
            raise FinanceHitlConsoleError("summary is required")
        if self.amount_minor <= 0:
            raise FinanceHitlConsoleError("amount_minor must be > 0")
        if not self.currency.strip():
            raise FinanceHitlConsoleError("currency is required")
        if not self.submitted_at.strip():
            raise FinanceHitlConsoleError("submitted_at is required")
        if not self.submitted_by.strip():
            raise FinanceHitlConsoleError("submitted_by is required")
        if not 0 <= self.risk_score <= 100:
            raise FinanceHitlConsoleError("risk_score must be between 0 and 100")
        if not self.evidence_reference_ids:
            raise FinanceHitlConsoleError("evidence_reference_ids must not be empty")
        if not self.data_check_id.strip():
            raise FinanceHitlConsoleError("data_check_id is required")


@dataclass(frozen=True)
class ApprovalConsoleSnapshot:
    view_state: ConsoleViewState
    total_items: int
    pending_items: int
    in_review_items: int
    resolved_items: int
    visible_items: tuple[ApprovalQueueItem, ...]


def build_default_console_policy_engine() -> AgentPolicyGuardrailEngine:
    return AgentPolicyGuardrailEngine(
        rules=(
            ToolPolicyRule(
                tool_name="finance.hitl_console.review",
                allowed_roles=("finance_ops", "compliance", "admin"),
                allowed_country_codes=("GH", "NG", "JM"),
                risk_level=RiskLevel.MEDIUM,
            ),
        )
    )


class FinanceInsuranceHitlApprovalConsole:
    """Queue and resolve finance or payout approvals with operator state tracking."""

    def __init__(
        self,
        *,
        policy_engine: AgentPolicyGuardrailEngine | None = None,
    ) -> None:
        self._policy_engine = policy_engine or build_default_console_policy_engine()
        self._items: dict[str, ApprovalQueueItem] = {}

    def queue_partner_decision(
        self,
        *,
        item_id: str,
        decision: FinancePartnerDecisionResponse,
        country_code: str,
        amount_minor: int,
        currency: str,
        submitted_at: str,
        submitted_by: str,
        risk_score: int,
        evidence_reference_ids: tuple[str, ...],
    ) -> ApprovalQueueItem:
        if decision.outcome != FinanceDecisionOutcome.MANUAL_REVIEW or not decision.requires_hitl:
            raise FinanceHitlConsoleError("partner decision does not require HITL review")
        return self._queue_item(
            ApprovalQueueItem(
                item_id=item_id,
                item_type=ApprovalItemType.PARTNER_DECISION,
                source_reference_id=decision.partner_reference_id,
                country_code=country_code.upper(),
                summary=f"Review {decision.decision_type.value} decision for {decision.product_code}",
                amount_minor=amount_minor,
                currency=currency.upper(),
                submitted_at=submitted_at,
                submitted_by=submitted_by,
                risk_score=risk_score,
                status=ApprovalState.PENDING,
                evidence_reference_ids=evidence_reference_ids,
                data_check_id="DI-003",
                actions=(
                    ApprovalAction(
                        action="queued",
                        actor_id=submitted_by,
                        occurred_at=submitted_at,
                        note=decision.rationale_summary,
                    ),
                ),
            )
        )

    def queue_payout_event(
        self,
        *,
        item_id: str,
        payout_event: ParametricPayoutEvent,
        submitted_at: str,
        submitted_by: str,
        risk_score: int,
    ) -> ApprovalQueueItem:
        return self._queue_item(
            ApprovalQueueItem(
                item_id=item_id,
                item_type=ApprovalItemType.PAYOUT_EVENT,
                source_reference_id=payout_event.event_id,
                country_code=payout_event.country_code.upper(),
                summary=f"Approve payout for {payout_event.product_code}",
                amount_minor=payout_event.payout_amount_minor,
                currency=payout_event.payout_currency.upper(),
                submitted_at=submitted_at,
                submitted_by=submitted_by,
                risk_score=risk_score,
                status=ApprovalState.PENDING,
                evidence_reference_ids=payout_event.evidence_reference_ids,
                data_check_id="DI-003",
                actions=(
                    ApprovalAction(
                        action="queued",
                        actor_id=submitted_by,
                        occurred_at=submitted_at,
                        note=payout_event.source_reference,
                    ),
                ),
            )
        )

    def start_review(
        self,
        *,
        item_id: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        occurred_at: str,
        note: str | None = None,
    ) -> ApprovalQueueItem:
        item = self._get_item(item_id)
        if item.status != ApprovalState.PENDING:
            raise FinanceHitlConsoleError("only pending items can enter review")
        self._authorize(actor_role=actor_role, country_code=country_code, risk_score=item.risk_score)
        updated = replace(
            item,
            status=ApprovalState.IN_REVIEW,
            actions=item.actions
            + (ApprovalAction("start_review", actor_id=actor_id, occurred_at=occurred_at, note=note),),
        )
        self._items[item_id] = updated
        return updated

    def decide(
        self,
        *,
        item_id: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        occurred_at: str,
        approved: bool,
        note: str,
    ) -> ApprovalQueueItem:
        item = self._get_item(item_id)
        if item.status != ApprovalState.IN_REVIEW:
            raise FinanceHitlConsoleError("item must be in_review before decision")
        self._authorize(actor_role=actor_role, country_code=country_code, risk_score=item.risk_score)
        updated = replace(
            item,
            status=ApprovalState.APPROVED if approved else ApprovalState.REJECTED,
            actions=item.actions
            + (
                ApprovalAction(
                    "approve" if approved else "reject",
                    actor_id=actor_id,
                    occurred_at=occurred_at,
                    note=note,
                ),
            ),
        )
        self._items[item_id] = updated
        return updated

    def snapshot(
        self,
        *,
        status_filter: ApprovalState | None = None,
    ) -> ApprovalConsoleSnapshot:
        visible_items = tuple(
            item for item in self._items.values() if status_filter is None or item.status == status_filter
        )
        if not self._items:
            view_state = ConsoleViewState.EMPTY
        elif not visible_items:
            view_state = ConsoleViewState.FILTERED_EMPTY
        else:
            view_state = ConsoleViewState.READY

        return ApprovalConsoleSnapshot(
            view_state=view_state,
            total_items=len(self._items),
            pending_items=sum(1 for item in self._items.values() if item.status == ApprovalState.PENDING),
            in_review_items=sum(1 for item in self._items.values() if item.status == ApprovalState.IN_REVIEW),
            resolved_items=sum(
                1
                for item in self._items.values()
                if item.status in {ApprovalState.APPROVED, ApprovalState.REJECTED}
            ),
            visible_items=visible_items,
        )

    def _authorize(self, *, actor_role: str, country_code: str, risk_score: int) -> None:
        outcome = self._policy_engine.evaluate(
            PolicyEvaluationInput(
                tool_name="finance.hitl_console.review",
                actor_role=actor_role,
                country_code=country_code,
                risk_score=risk_score,
                hitl_approved=True,
            )
        )
        if outcome.decision != PolicyDecision.ALLOW:
            raise FinanceHitlConsoleError(f"operator not allowed: {outcome.reason_code}")

    def _queue_item(self, item: ApprovalQueueItem) -> ApprovalQueueItem:
        if item.item_id in self._items:
            raise FinanceHitlConsoleError("item_id already queued")
        self._items[item.item_id] = item
        return item

    def _get_item(self, item_id: str) -> ApprovalQueueItem:
        try:
            return self._items[item_id]
        except KeyError as exc:
            raise FinanceHitlConsoleError(f"unknown item_id: {item_id}") from exc
