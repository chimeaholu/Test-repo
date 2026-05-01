from agro_v2.frontend_negotiation_ui import FrontendNegotiationUi
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives
from agro_v2.negotiation import NegotiationWorkflow


def build_thread():
    workflow = NegotiationWorkflow(clock=lambda: "2026-04-13T00:00:00Z")
    workflow.create_thread(
        thread_id="thread-9",
        listing_id="listing-9",
        buyer_id="buyer-9",
        seller_id="seller-9",
        currency="GHS",
        opening_actor_id="buyer-9",
        opening_amount_minor=410000,
    )
    workflow.submit_offer(
        thread_id="thread-9",
        actor_id="seller-9",
        amount_minor=430000,
    )
    return workflow.request_human_confirmation(
        thread_id="thread-9",
        requested_by="seller-9",
        required_confirmer_id="buyer-9",
    )


def test_negotiation_inbox_and_thread_keep_confirmation_banner():
    ui = FrontendNegotiationUi(
        state_library=build_default_frontend_state_primitives()
    )
    thread = build_thread()

    inbox = ui.build_inbox((thread,))
    surface = ui.build_thread(thread)
    audit = ui.audit(inbox=inbox, thread_surface=surface)

    assert inbox[0].badge_label == "Needs confirmation"
    assert "buyer-9" in (surface.confirmation_banner or "")
    assert surface.trust_state.wrapper_component == "TrustPanel"
    assert audit.passed is True
