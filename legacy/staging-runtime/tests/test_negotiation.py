import pytest

from agro_v2.negotiation import (
    NegotiationError,
    NegotiationState,
    NegotiationWorkflow,
)


def build_workflow() -> NegotiationWorkflow:
    return NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00+00:00")


def open_thread(workflow: NegotiationWorkflow) -> None:
    workflow.create_thread(
        thread_id="thread-1",
        listing_id="listing-1",
        buyer_id="buyer-1",
        seller_id="seller-1",
        currency="GHS",
        opening_actor_id="buyer-1",
        opening_amount_minor=420000,
        opening_note="initial bid",
    )


def test_negotiation_flow_requires_human_confirmation_before_accept():
    workflow = build_workflow()
    open_thread(workflow)

    counter = workflow.submit_offer(
        thread_id="thread-1",
        actor_id="seller-1",
        amount_minor=450000,
        note="counter",
    )
    pending = workflow.request_human_confirmation(
        thread_id="thread-1",
        requested_by="seller-1",
        required_confirmer_id="buyer-1",
        note="final review",
    )
    accepted = workflow.confirm(
        thread_id="thread-1",
        confirmer_id="buyer-1",
        approved=True,
    )

    assert counter.state == NegotiationState.OPEN
    assert counter.current_amount_minor == 450000
    assert pending.state == NegotiationState.PENDING_CONFIRMATION
    assert pending.confirmation_checkpoint is not None
    assert accepted.state == NegotiationState.ACCEPTED
    assert accepted.confirmation_checkpoint is None


def test_confirmation_reject_path_is_terminal():
    workflow = build_workflow()
    open_thread(workflow)
    workflow.request_human_confirmation(
        thread_id="thread-1",
        requested_by="buyer-1",
        required_confirmer_id="seller-1",
    )
    rejected = workflow.confirm(
        thread_id="thread-1",
        confirmer_id="seller-1",
        approved=False,
    )

    assert rejected.state == NegotiationState.REJECTED
    with pytest.raises(NegotiationError, match="terminal negotiation thread cannot be modified"):
        workflow.submit_offer(
            thread_id="thread-1",
            actor_id="buyer-1",
            amount_minor=430000,
        )


def test_terminal_state_guards_block_further_mutation():
    workflow = build_workflow()
    open_thread(workflow)
    workflow.request_human_confirmation(
        thread_id="thread-1",
        requested_by="buyer-1",
        required_confirmer_id="seller-1",
    )
    workflow.confirm(
        thread_id="thread-1",
        confirmer_id="seller-1",
        approved=True,
    )

    with pytest.raises(NegotiationError, match="terminal negotiation thread cannot be modified"):
        workflow.cancel(thread_id="thread-1", actor_id="buyer-1")

    with pytest.raises(NegotiationError, match="terminal negotiation thread cannot be modified"):
        workflow.request_human_confirmation(
            thread_id="thread-1",
            requested_by="buyer-1",
            required_confirmer_id="seller-1",
        )


def test_unauthorized_confirmer_is_rejected():
    workflow = build_workflow()
    open_thread(workflow)
    workflow.request_human_confirmation(
        thread_id="thread-1",
        requested_by="buyer-1",
        required_confirmer_id="seller-1",
    )

    with pytest.raises(NegotiationError, match="unauthorized confirmer"):
        workflow.confirm(
            thread_id="thread-1",
            confirmer_id="buyer-1",
            approved=True,
        )


def test_cannot_confirm_without_active_checkpoint():
    workflow = build_workflow()
    open_thread(workflow)

    with pytest.raises(NegotiationError, match="checkpoint is not active"):
        workflow.confirm(
            thread_id="thread-1",
            confirmer_id="seller-1",
            approved=True,
        )
