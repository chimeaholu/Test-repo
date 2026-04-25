"""F-009 negotiation inbox and thread surfaces."""

from __future__ import annotations

from dataclasses import dataclass

from .frontend_state_primitives import FrontendStatePrimitiveLibrary, StatePrimitive
from .negotiation import NegotiationState, NegotiationThread


class FrontendNegotiationUiError(ValueError):
    """Raised when negotiation inbox or thread contracts are invalid."""


@dataclass(frozen=True)
class NegotiationInboxItem:
    thread_id: str
    headline: str
    state: NegotiationState
    latest_amount_label: str
    badge_label: str
    thread_route: str


@dataclass(frozen=True)
class NegotiationThreadSurface:
    thread_id: str
    thread_route: str
    participants: tuple[str, str]
    offer_rows: tuple[str, ...]
    confirmation_banner: str | None
    trust_state: StatePrimitive


@dataclass(frozen=True)
class NegotiationUiAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendNegotiationUi:
    """Projects negotiation threads into inbox and detail views."""

    def __init__(self, *, state_library: FrontendStatePrimitiveLibrary) -> None:
        self._state_library = state_library

    def build_inbox(self, threads: tuple[NegotiationThread, ...]) -> tuple[NegotiationInboxItem, ...]:
        ordered = sorted(threads, key=lambda thread: thread.updated_at, reverse=True)
        return tuple(
            NegotiationInboxItem(
                thread_id=thread.thread_id,
                headline=f"{thread.listing_id} negotiation",
                state=thread.state,
                latest_amount_label=_format_minor(thread.current_amount_minor, thread.currency),
                badge_label=_badge_for(thread.state),
                thread_route=f"/app/market/negotiations/{thread.thread_id}",
            )
            for thread in ordered
        )

    def build_thread(self, thread: NegotiationThread) -> NegotiationThreadSurface:
        banner = None
        if thread.state == NegotiationState.PENDING_CONFIRMATION and thread.confirmation_checkpoint:
            banner = (
                "Waiting for "
                f"{thread.confirmation_checkpoint.required_confirmer_id} to confirm the latest offer."
            )
        trust_state = self._state_library.primitive_for(
            flow=self._trust_flow(),
            state=self._trust_state(),
        )
        return NegotiationThreadSurface(
            thread_id=thread.thread_id,
            thread_route=f"/app/market/negotiations/{thread.thread_id}",
            participants=(thread.buyer_id, thread.seller_id),
            offer_rows=tuple(
                f"Round {offer.round_number}: {offer.actor_id} offered "
                f"{_format_minor(offer.amount_minor, thread.currency)}"
                for offer in thread.offers
            ),
            confirmation_banner=banner,
            trust_state=trust_state,
        )

    def audit(
        self,
        *,
        inbox: tuple[NegotiationInboxItem, ...],
        thread_surface: NegotiationThreadSurface,
    ) -> NegotiationUiAudit:
        issues: list[str] = []
        if not inbox:
            issues.append("negotiation_inbox_empty")
        if thread_surface.thread_route not in tuple(item.thread_route for item in inbox):
            issues.append("thread_route_missing_from_inbox")
        if not thread_surface.offer_rows:
            issues.append("offer_rows_missing")
        return NegotiationUiAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C03",
            ux_data_check_id="F-009",
        )

    @staticmethod
    def _trust_flow():
        from .interaction_feedback_library import CriticalFlow

        return CriticalFlow.NEGOTIATION_REPLY

    @staticmethod
    def _trust_state():
        from .interaction_feedback_library import InteractionState

        return InteractionState.TRUST


def _format_minor(amount_minor: int, currency: str) -> str:
    return f"{currency} {amount_minor / 100:.2f}"


def _badge_for(state: NegotiationState) -> str:
    if state == NegotiationState.PENDING_CONFIRMATION:
        return "Needs confirmation"
    if state == NegotiationState.OPEN:
        return "Active"
    return state.value.replace("_", " ").title()
