import pytest

from agro_v2.interaction_feedback_library import (
    CriticalFlow,
    FeedbackPattern,
    InteractionFeedbackError,
    InteractionFeedbackLibrary,
    InteractionState,
    build_default_interaction_feedback_library,
)
from agro_v2.offline_queue import ConnectivityState
from agro_v2.visual_language_system import build_default_visual_language_system


def test_default_library_covers_every_critical_flow_and_interaction_state():
    library = build_default_interaction_feedback_library()
    snapshot = library.coverage_snapshot()

    assert snapshot["flow_count"] == 5
    assert set(snapshot["states_per_flow"]["listing_create"]) == {
        "loading",
        "error",
        "offline",
        "retry",
        "trust",
    }
    assert {"primary_button", "body_card"} <= set(snapshot["component_names"])


def test_audit_flow_surfaces_offline_handoff_guidance():
    library = build_default_interaction_feedback_library()

    offline = library.audit_flow(
        flow=CriticalFlow.OFFLINE_SYNC,
        connectivity_state=ConnectivityState.OFFLINE,
        queue_depth=1,
    )
    degraded = library.audit_flow(
        flow=CriticalFlow.OFFLINE_SYNC,
        connectivity_state=ConnectivityState.DEGRADED,
        queue_depth=3,
    )

    assert offline.passed is True
    assert offline.suggested_channel == "whatsapp"
    assert degraded.suggested_channel == "ussd"
    assert offline.ux_journey_id == "UXJ-002"
    assert offline.ux_data_check_id == "UXDI-002"


def test_trust_patterns_require_trust_markers():
    with pytest.raises(
        InteractionFeedbackError,
        match="trust state patterns require trust_markers",
    ):
        FeedbackPattern(
            flow=CriticalFlow.ADVISORY_REQUEST,
            state=InteractionState.TRUST,
            component_name="primary_button",
            headline="Proof ready",
            body="Show provenance before action.",
            primary_action="view_proof",
        )


def test_library_rejects_missing_state_coverage():
    with pytest.raises(
        InteractionFeedbackError,
        match="missing interaction pattern for listing_create:error",
    ):
        InteractionFeedbackLibrary(
            visual_system=build_default_visual_language_system(),
            patterns=(
                FeedbackPattern(
                    flow=CriticalFlow.LISTING_CREATE,
                    state=InteractionState.LOADING,
                    component_name="primary_button",
                    headline="Preparing listing",
                    body="Loading state",
                    primary_action="wait",
                ),
            ),
        )


def test_library_rejects_unknown_visual_component():
    patterns = []
    for flow in CriticalFlow:
        for state in InteractionState:
            patterns.append(
                FeedbackPattern(
                    flow=flow,
                    state=state,
                    component_name="ghost_component",
                    headline=f"{flow.value}:{state.value}",
                    body="Body",
                    primary_action="act",
                    trust_markers=("audit",) if state == InteractionState.TRUST else (),
                )
            )

    with pytest.raises(
        InteractionFeedbackError,
        match="unknown visual components",
    ):
        InteractionFeedbackLibrary(
            visual_system=build_default_visual_language_system(),
            patterns=tuple(patterns),
        )
