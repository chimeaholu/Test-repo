"""Offer/bid negotiation workflow with human confirmation checkpoint."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone
from enum import Enum


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class NegotiationState(str, Enum):
    OPEN = "open"
    PENDING_CONFIRMATION = "pending_confirmation"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


TERMINAL_STATES = {
    NegotiationState.ACCEPTED,
    NegotiationState.REJECTED,
    NegotiationState.CANCELLED,
}


class NegotiationError(ValueError):
    """Raised when negotiation workflow transition is invalid."""


@dataclass(frozen=True)
class OfferBid:
    round_number: int
    actor_id: str
    amount_minor: int
    note: str
    created_at: str


@dataclass(frozen=True)
class ConfirmationCheckpoint:
    requested_by: str
    required_confirmer_id: str
    requested_at: str
    note: str


@dataclass(frozen=True)
class NegotiationThread:
    thread_id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    currency: str
    state: NegotiationState
    current_amount_minor: int
    offers: tuple[OfferBid, ...]
    confirmation_checkpoint: ConfirmationCheckpoint | None
    version: int
    created_at: str
    updated_at: str


class NegotiationWorkflow:
    """In-memory negotiation thread state machine for B-010."""

    def __init__(self, clock=None) -> None:
        self._clock = clock or _utc_now_iso
        self._threads: dict[str, NegotiationThread] = {}

    def create_thread(
        self,
        *,
        thread_id: str,
        listing_id: str,
        buyer_id: str,
        seller_id: str,
        currency: str,
        opening_actor_id: str,
        opening_amount_minor: int,
        opening_note: str = "",
    ) -> NegotiationThread:
        if thread_id in self._threads:
            raise NegotiationError("thread already exists")
        self._validate_amount(opening_amount_minor)
        self._validate_currency(currency)
        self._validate_participant(opening_actor_id, buyer_id=buyer_id, seller_id=seller_id)

        now_iso = self._clock()
        opening = OfferBid(
            round_number=1,
            actor_id=opening_actor_id,
            amount_minor=opening_amount_minor,
            note=opening_note,
            created_at=now_iso,
        )
        thread = NegotiationThread(
            thread_id=thread_id,
            listing_id=listing_id,
            buyer_id=buyer_id,
            seller_id=seller_id,
            currency=currency,
            state=NegotiationState.OPEN,
            current_amount_minor=opening_amount_minor,
            offers=(opening,),
            confirmation_checkpoint=None,
            version=1,
            created_at=now_iso,
            updated_at=now_iso,
        )
        self._threads[thread_id] = thread
        return thread

    def read_thread(self, thread_id: str) -> NegotiationThread:
        thread = self._get_thread(thread_id)
        return replace(thread, offers=tuple(thread.offers))

    def submit_offer(
        self,
        *,
        thread_id: str,
        actor_id: str,
        amount_minor: int,
        note: str = "",
    ) -> NegotiationThread:
        thread = self._get_thread(thread_id)
        self._ensure_open(thread)
        self._validate_participant(actor_id, buyer_id=thread.buyer_id, seller_id=thread.seller_id)
        self._validate_amount(amount_minor)

        next_offer = OfferBid(
            round_number=len(thread.offers) + 1,
            actor_id=actor_id,
            amount_minor=amount_minor,
            note=note,
            created_at=self._clock(),
        )
        return self._save(
            replace(
                thread,
                current_amount_minor=amount_minor,
                offers=(*thread.offers, next_offer),
                version=thread.version + 1,
                updated_at=self._clock(),
            )
        )

    def request_human_confirmation(
        self,
        *,
        thread_id: str,
        requested_by: str,
        required_confirmer_id: str,
        note: str = "",
    ) -> NegotiationThread:
        thread = self._get_thread(thread_id)
        self._ensure_open(thread)
        self._validate_participant(
            requested_by,
            buyer_id=thread.buyer_id,
            seller_id=thread.seller_id,
        )
        self._validate_participant(
            required_confirmer_id,
            buyer_id=thread.buyer_id,
            seller_id=thread.seller_id,
        )
        checkpoint = ConfirmationCheckpoint(
            requested_by=requested_by,
            required_confirmer_id=required_confirmer_id,
            requested_at=self._clock(),
            note=note,
        )
        return self._save(
            replace(
                thread,
                state=NegotiationState.PENDING_CONFIRMATION,
                confirmation_checkpoint=checkpoint,
                version=thread.version + 1,
                updated_at=self._clock(),
            )
        )

    def confirm(
        self,
        *,
        thread_id: str,
        confirmer_id: str,
        approved: bool,
    ) -> NegotiationThread:
        thread = self._get_thread(thread_id)
        if thread.state != NegotiationState.PENDING_CONFIRMATION:
            raise NegotiationError("confirmation checkpoint is not active")
        checkpoint = thread.confirmation_checkpoint
        if checkpoint is None:
            raise NegotiationError("confirmation checkpoint is missing")
        if checkpoint.required_confirmer_id != confirmer_id:
            raise NegotiationError("unauthorized confirmer")

        final_state = NegotiationState.ACCEPTED if approved else NegotiationState.REJECTED
        return self._save(
            replace(
                thread,
                state=final_state,
                confirmation_checkpoint=None,
                version=thread.version + 1,
                updated_at=self._clock(),
            )
        )

    def cancel(self, *, thread_id: str, actor_id: str) -> NegotiationThread:
        thread = self._get_thread(thread_id)
        if thread.state in TERMINAL_STATES:
            raise NegotiationError("terminal negotiation thread cannot be modified")
        self._validate_participant(actor_id, buyer_id=thread.buyer_id, seller_id=thread.seller_id)
        return self._save(
            replace(
                thread,
                state=NegotiationState.CANCELLED,
                confirmation_checkpoint=None,
                version=thread.version + 1,
                updated_at=self._clock(),
            )
        )

    def _ensure_open(self, thread: NegotiationThread) -> None:
        if thread.state in TERMINAL_STATES:
            raise NegotiationError("terminal negotiation thread cannot be modified")
        if thread.state != NegotiationState.OPEN:
            raise NegotiationError("negotiation thread is waiting for confirmation")

    def _get_thread(self, thread_id: str) -> NegotiationThread:
        if thread_id not in self._threads:
            raise KeyError(f"unknown thread: {thread_id}")
        return self._threads[thread_id]

    @staticmethod
    def _validate_participant(actor_id: str, *, buyer_id: str, seller_id: str) -> None:
        if actor_id not in {buyer_id, seller_id}:
            raise NegotiationError("actor is not part of this negotiation")

    @staticmethod
    def _validate_amount(amount_minor: int) -> None:
        if not isinstance(amount_minor, int) or isinstance(amount_minor, bool) or amount_minor <= 0:
            raise NegotiationError("amount_minor must be a positive integer")

    @staticmethod
    def _validate_currency(currency: str) -> None:
        if len(currency) != 3 or not currency.isalpha() or currency != currency.upper():
            raise NegotiationError("currency must be a 3-letter uppercase code")

    def _save(self, thread: NegotiationThread) -> NegotiationThread:
        self._threads[thread.thread_id] = thread
        return thread
