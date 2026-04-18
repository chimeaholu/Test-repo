from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives
from agro_v2.interaction_feedback_library import CriticalFlow, InteractionState
from agro_v2.offline_queue import ConnectivityState


def test_offline_listing_publish_primitive_exposes_retry_channel():
    library = build_default_frontend_state_primitives()

    primitive = library.primitive_for(
        flow=CriticalFlow.LISTING_CREATE,
        state=InteractionState.OFFLINE,
        connectivity_state=ConnectivityState.OFFLINE,
        queue_depth=2,
    )

    assert primitive.wrapper_component == "OfflinePanel"
    assert primitive.suggested_channel == "whatsapp"
    assert primitive.primary_action == "switch_channel"


def test_state_primitive_library_covers_all_flow_state_pairs():
    library = build_default_frontend_state_primitives()
    report = library.coverage_report()

    assert report.passed is True
    assert report.missing_pairs == ()
    assert report.ux_journey_id == "queue-state-tests"


def test_trust_primitive_keeps_proof_markers():
    library = build_default_frontend_state_primitives()

    primitive = library.primitive_for(
        flow=CriticalFlow.NEGOTIATION_REPLY,
        state=InteractionState.TRUST,
    )

    assert primitive.wrapper_component == "TrustPanel"
    assert primitive.trust_markers == ("audit_log", "source_link")
