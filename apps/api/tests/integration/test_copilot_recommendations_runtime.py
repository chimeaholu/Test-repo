from datetime import UTC, date, datetime

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.transport import TransportRepository
from app.modules.copilot.evaluator import evaluate_recommendation_scenarios


def _create_session(client, *, name: str, email: str, role: str, country_code: str = "GH") -> tuple[str, str]:
    register = client.post(
        "/api/v1/identity/register/password",
        json={
            "country_code": country_code,
            "display_name": name,
            "email": email,
            "password": "Harvest!2026",
            "phone_number": None,
            "role": role,
        },
    )
    assert register.status_code == 200
    token = register.json()["access_token"]
    actor_id = register.json()["session"]["actor"]["actor_id"]
    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04",
            "scope_ids": ["identity.core", "workflow.audit", "transport.logistics"],
            "captured_at": datetime.now(tz=UTC).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert consent.status_code == 200
    return token, actor_id


def test_copilot_recommendations_cover_farmer_buyer_and_transporter_roles(client, session) -> None:
    farmer_token, farmer_actor_id = _create_session(
        client,
        name="Ama Farmer",
        email="ama.copilot@example.com",
        role="farmer",
    )
    _, seller_actor_id = _create_session(
        client,
        name="Kwame Seller",
        email="kwame.copilot@example.com",
        role="farmer",
    )
    buyer_token, buyer_actor_id = _create_session(
        client,
        name="Kojo Buyer",
        email="kojo.copilot@example.com",
        role="buyer",
    )
    transporter_token, transporter_actor_id = _create_session(
        client,
        name="Yaw Transport",
        email="yaw.copilot@example.com",
        role="transporter",
    )

    climate_repository = ClimateRepository(session)
    climate_repository.upsert_farm_profile(
        farm_id="farm-copilot-1",
        actor_id=farmer_actor_id,
        country_code="GH",
        farm_name="North Cassava Block",
        district="Tamale",
        crop_type="Cassava",
        hectares=4.2,
        latitude=9.4,
        longitude=-0.84,
    )
    climate_repository.create_alert(
        alert_id="alert-copilot-1",
        farm_id="farm-copilot-1",
        actor_id=farmer_actor_id,
        country_code="GH",
        observation_id="obs-copilot-1",
        alert_type="flood_risk",
        severity="critical",
        precedence_rank=10,
        headline="Flood risk for North Cassava Block",
        detail="Heavy rainfall remains open. Review drainage and acknowledge the alert before field dispatch.",
        source_confidence="high",
        degraded_mode=False,
        degraded_reason_codes=[],
        farm_context={"farm_name": "North Cassava Block"},
    )

    marketplace_repository = MarketplaceRepository(session)
    draft_listing = marketplace_repository.create_listing(
        listing_id="listing-copilot-draft",
        actor_id=farmer_actor_id,
        country_code="GH",
        title="Cassava lots for district buyers",
        commodity="Cassava",
        quantity_tons=5.0,
        price_amount=420.0,
        price_currency="GHS",
        location="Tamale, GH",
        summary="Fresh cassava listing waiting for publication.",
    )
    buyer_listing = marketplace_repository.create_listing(
        listing_id="listing-copilot-buyer",
        actor_id=seller_actor_id,
        country_code="GH",
        title="Premium maize for buyer confirmation",
        commodity="Maize",
        quantity_tons=7.5,
        price_amount=510.0,
        price_currency="GHS",
        location="Kumasi, GH",
        summary="Published listing used to verify buyer-side approval recommendations.",
    )
    marketplace_repository.publish_listing(listing=buyer_listing)
    negotiation_thread = marketplace_repository.create_negotiation_thread(
        thread_id="thread-copilot-1",
        listing_id=buyer_listing.listing_id,
        seller_actor_id=buyer_listing.actor_id,
        buyer_actor_id=buyer_actor_id,
        country_code="GH",
        offer_amount=495.0,
        offer_currency="GHS",
        note="Buyer offer ready for explicit confirmation.",
        actor_id=buyer_actor_id,
    )
    marketplace_repository.update_negotiation_thread(
        thread=negotiation_thread,
        status="pending_confirmation",
        actor_id=buyer_listing.actor_id,
        action="confirmation_requested",
        note="Approve this checkpoint to close the deal.",
        confirmation_requested_by_actor_id=buyer_listing.actor_id,
        required_confirmer_actor_id=buyer_actor_id,
    )

    transport_repository = TransportRepository(session)
    load = transport_repository.create_load(
        load_id="load-copilot-1",
        poster_actor_id=seller_actor_id,
        country_code="GH",
        origin_location="Tamale, GH",
        destination_location="Accra, GH",
        commodity="Cassava",
        weight_tons=6.1,
        vehicle_type_required="flatbed",
        pickup_date=date(2026, 4, 30),
        delivery_deadline=date(2026, 5, 1),
        price_offer=880.0,
        price_currency="GHS",
    )
    transport_repository.update_load(
        load=load,
        status="assigned",
        assigned_transporter_actor_id=transporter_actor_id,
    )
    shipment = transport_repository.create_shipment(
        shipment_id="shipment-copilot-1",
        load_id=load.load_id,
        transporter_actor_id=transporter_actor_id,
        country_code="GH",
        vehicle_info={"plate_number": "GT-2204-26", "vehicle_type": "flatbed"},
        current_location_lat=9.41,
        current_location_lng=-0.85,
    )
    transport_repository.create_shipment_event(
        event_id="event-copilot-1",
        shipment_id=shipment.shipment_id,
        actor_id=transporter_actor_id,
        event_type="assigned",
        event_at=datetime.now(tz=UTC),
        location_lat=9.41,
        location_lng=-0.85,
        notes="Assigned for proactive copilot coverage.",
    )
    session.commit()

    farmer_response = client.get(
        "/api/v1/copilot/recommendations",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    buyer_response = client.get(
        "/api/v1/copilot/recommendations",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    transporter_response = client.get(
        "/api/v1/copilot/recommendations",
        headers={"Authorization": f"Bearer {transporter_token}"},
    )

    assert farmer_response.status_code == 200
    assert buyer_response.status_code == 200
    assert transporter_response.status_code == 200
    assert farmer_response.json()["schema_version"] == get_envelope_schema_version()
    assert farmer_response.json()["supports_non_web_delivery"] is True

    farmer_items = farmer_response.json()["items"]
    buyer_items = buyer_response.json()["items"]
    transporter_items = transporter_response.json()["items"]

    assert any(
        item["action"]["command_name"] == "climate.alerts.acknowledge" for item in farmer_items
    )
    assert any(
        item["action"]["command_name"] == "market.listings.publish"
        and draft_listing.listing_id in item["source_refs"]
        for item in farmer_items
    )
    assert any(
        item["action"]["command_name"] == "market.negotiations.confirm.approve"
        and negotiation_thread.thread_id in item["source_refs"]
        for item in buyer_items
    )
    assert any(
        item["action"]["kind"] == "transport_endpoint"
        and item["action"]["transport_endpoint"]["path"].endswith(
            f"/{shipment.shipment_id}/events"
        )
        for item in transporter_items
    )
    assert all(
        item["action"]["requires_confirmation"]
        for item in farmer_items + buyer_items + transporter_items
        if item["action"]["kind"] != "open_route"
    )

    evaluation_report = evaluate_recommendation_scenarios(
        scenarios=[
            {
                "scenario_id": "farmer-draft-and-alert",
                "actor_id": farmer_actor_id,
                "role": "farmer",
                "expected_action_kinds": ["workflow_command"],
                "recommendations": farmer_items,
            },
            {
                "scenario_id": "buyer-pending-confirmation",
                "actor_id": buyer_actor_id,
                "role": "buyer",
                "expected_action_kinds": ["workflow_command"],
                "recommendations": buyer_items,
            },
            {
                "scenario_id": "transporter-assigned-shipment",
                "actor_id": transporter_actor_id,
                "role": "transporter",
                "expected_action_kinds": ["transport_endpoint"],
                "recommendations": transporter_items,
            },
        ]
    )

    assert evaluation_report["schema_version"] == get_envelope_schema_version()
    assert all(item["passed"] for item in evaluation_report["scenarios"])
