import pytest

from agro_v2.state_store import CanonicalStateStore
from agro_v2.ussd_adapter import (
    UssdAdapterContract,
    UssdAdapterError,
    UssdMenu,
    UssdMenuOption,
    UssdSessionStatus,
    build_default_ussd_adapter,
)


def test_session_serialization_round_trips_compact_menu_state():
    adapter = build_default_ussd_adapter()
    started = adapter.start_session(
        session_id="sess-4-1",
        workflow_id="workflow-4-1",
        phone_number="+2335550100",
        country_code="GH",
        now_epoch_ms=1_000,
    )

    restored = adapter.deserialize_session(started.serialized_session)

    assert restored.session_id == "sess-4-1"
    assert restored.current_menu_id == "root"
    assert restored.status == UssdSessionStatus.ACTIVE


def test_marketplace_menu_selection_preserves_compact_navigation():
    adapter = build_default_ussd_adapter()
    started = adapter.start_session(
        session_id="sess-4-2",
        workflow_id="workflow-4-2",
        phone_number="+2335550101",
        country_code="GH",
        now_epoch_ms=1_000,
    )

    response = adapter.handle_input(
        session=started.session,
        input_text="2",
        now_epoch_ms=2_000,
    )

    assert response.session.current_menu_id == "marketplace"
    assert response.end_session is False
    assert "Create listing" in response.screen_text


def test_terminal_selection_applies_state_store_transition_and_closes_session():
    store = CanonicalStateStore()
    adapter = build_default_ussd_adapter(state_store=store)
    started = adapter.start_session(
        session_id="sess-4-3",
        workflow_id="workflow-4-3",
        phone_number="+2335550102",
        country_code="GH",
        now_epoch_ms=1_000,
    )
    market = adapter.handle_input(
        session=started.session,
        input_text="2",
        now_epoch_ms=2_000,
    )

    result = adapter.handle_input(
        session=market.session,
        input_text="1",
        now_epoch_ms=3_000,
    )
    snapshot = store.snapshot("workflow-4-3")

    assert result.end_session is True
    assert result.transition_applied is True
    assert result.session.status == UssdSessionStatus.CLOSED
    assert snapshot.active_channel == "ussd"
    assert snapshot.state["listing"]["draft_requested"] is True
    assert snapshot.state["ussd"]["current_menu_id"] == "listing_terminal"


def test_timeout_recovery_prompts_resume_or_restart():
    adapter = build_default_ussd_adapter()
    started = adapter.start_session(
        session_id="sess-4-4",
        workflow_id="workflow-4-4",
        phone_number="+2335550103",
        country_code="GH",
        now_epoch_ms=1_000,
    )
    market = adapter.handle_input(
        session=started.session,
        input_text="2",
        now_epoch_ms=2_000,
    )

    timed_out = adapter.handle_input(
        session=market.session,
        input_text="1",
        now_epoch_ms=100_001,
    )

    assert timed_out.recovery_required is True
    assert timed_out.session.status == UssdSessionStatus.TIMED_OUT
    assert "Session timed out" in timed_out.screen_text


def test_resume_after_timeout_restores_prior_menu():
    adapter = build_default_ussd_adapter()
    started = adapter.start_session(
        session_id="sess-4-5",
        workflow_id="workflow-4-5",
        phone_number="+2335550104",
        country_code="GH",
        now_epoch_ms=1_000,
    )
    market = adapter.handle_input(
        session=started.session,
        input_text="2",
        now_epoch_ms=2_000,
    )
    timed_out = adapter.handle_input(
        session=market.session,
        input_text="1",
        now_epoch_ms=100_001,
    )

    resumed = adapter.handle_input(
        session=timed_out.session,
        input_text="9",
        now_epoch_ms=100_100,
    )

    assert resumed.session.status == UssdSessionStatus.RECOVERED
    assert resumed.session.current_menu_id == "marketplace"
    assert "Session resumed" in resumed.screen_text


def test_menu_validation_rejects_unknown_next_menu():
    with pytest.raises(UssdAdapterError, match="unknown menu_id"):
        UssdAdapterContract(
            state_store=CanonicalStateStore(),
            menus=(
                UssdMenu(
                    menu_id="root",
                    prompt="Root",
                    options=(UssdMenuOption("1", "Broken", "missing"),),
                ),
                UssdMenu(
                    menu_id="timeout_recovery",
                    prompt="Timeout",
                    options=(UssdMenuOption("0", "Restart", "root"),),
                ),
            ),
        )
