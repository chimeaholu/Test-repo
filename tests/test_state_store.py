import pytest

from agro_v2.state_store import (
    CanonicalStateStore,
    IdempotencyConflictError,
    WorkflowCommand,
)


def test_replay_preserves_cross_channel_canonical_state():
    store = CanonicalStateStore()

    store.apply(
        WorkflowCommand(
            workflow_id="listing-123",
            channel="ussd",
            idempotency_key="token-1",
            event_type="listing.created",
            state_delta={"listing_status": "draft", "title": "Maize"},
            metadata={"journey": "CJ-002"},
        )
    )
    result = store.apply(
        WorkflowCommand(
            workflow_id="listing-123",
            channel="whatsapp",
            idempotency_key="token-2",
            event_type="listing.published",
            state_delta={"listing_status": "published", "price": 42},
            metadata={"journey": "DI-001"},
        )
    )

    snapshot = store.snapshot("listing-123")
    history = store.replay("listing-123")

    assert result.applied is True
    assert snapshot.active_channel == "whatsapp"
    assert snapshot.version == 2
    assert snapshot.state == {
        "listing_status": "published",
        "title": "Maize",
        "price": 42,
    }
    assert [item.channel for item in history] == ["ussd", "whatsapp"]
    assert history[-1].state == snapshot.state


def test_duplicate_idempotency_key_replays_without_mutating_state():
    store = CanonicalStateStore()
    command = WorkflowCommand(
        workflow_id="listing-123",
        channel="ussd",
        idempotency_key="token-1",
        event_type="listing.created",
        state_delta={"listing_status": "draft"},
        metadata={"journey": "EP-002"},
    )

    first = store.apply(command)
    second = store.apply(command)

    assert first.applied is True
    assert second.applied is False
    assert second.snapshot.version == 1
    assert second.transition.sequence == 1
    assert len(store.replay("listing-123")) == 1
    assert store.snapshot("listing-123").state == {"listing_status": "draft"}


def test_reused_token_with_different_payload_is_rejected():
    store = CanonicalStateStore()
    store.apply(
        WorkflowCommand(
            workflow_id="listing-123",
            channel="pwa",
            idempotency_key="token-1",
            event_type="listing.created",
            state_delta={"listing_status": "draft"},
        )
    )

    with pytest.raises(IdempotencyConflictError):
        store.apply(
            WorkflowCommand(
                workflow_id="listing-123",
                channel="pwa",
                idempotency_key="token-1",
                event_type="listing.created",
                state_delta={"listing_status": "published"},
            )
        )


def test_snapshot_returns_copy_of_internal_state():
    store = CanonicalStateStore()
    store.apply(
        WorkflowCommand(
            workflow_id="listing-123",
            channel="pwa",
            idempotency_key="token-1",
            event_type="listing.created",
            state_delta={"listing_status": "draft", "tags": ["new"]},
        )
    )

    snapshot = store.snapshot("listing-123")
    snapshot.state["tags"].append("mutated")

    assert store.snapshot("listing-123").state["tags"] == ["new"]


def test_nested_state_deltas_merge_without_dropping_existing_branches():
    store = CanonicalStateStore()
    store.apply(
        WorkflowCommand(
            workflow_id="workflow-1",
            channel="ussd",
            idempotency_key="token-1",
            event_type="listing.created",
            state_delta={
                "listing": {
                    "status": "draft",
                    "details": {"title": "Maize", "currency": "GHS"},
                }
            },
        )
    )

    result = store.apply(
        WorkflowCommand(
            workflow_id="workflow-1",
            channel="whatsapp",
            idempotency_key="token-2",
            event_type="listing.price_updated",
            state_delta={
                "listing": {
                    "details": {"price": 42},
                    "distribution": {"channel": "broadcast"},
                }
            },
        )
    )

    assert result.snapshot.state == {
        "listing": {
            "status": "draft",
            "details": {"title": "Maize", "currency": "GHS", "price": 42},
            "distribution": {"channel": "broadcast"},
        }
    }
    assert store.replay("workflow-1")[-1].state == result.snapshot.state


def test_replay_returns_copy_of_internal_history():
    store = CanonicalStateStore()
    store.apply(
        WorkflowCommand(
            workflow_id="workflow-1",
            channel="pwa",
            idempotency_key="token-1",
            event_type="listing.created",
            state_delta={"listing": {"status": "draft"}},
        )
    )

    history = store.replay("workflow-1")
    history[0].state["listing"]["status"] = "mutated"

    assert store.replay("workflow-1")[0].state["listing"]["status"] == "draft"
