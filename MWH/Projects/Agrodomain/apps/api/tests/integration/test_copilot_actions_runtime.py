from datetime import UTC, date, datetime

from sqlalchemy import select

from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.repositories.climate import ClimateRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.transport import TransportRepository


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


def test_copilot_resolve_and_execute_bounded_actions(client, session) -> None:
    farmer_token, farmer_actor_id = _create_session(
        client,
        name="Ama Farmer",
        email="ama.copilot.actions@example.com",
        role="farmer",
    )
    _, seller_actor_id = _create_session(
        client,
        name="Kwame Seller",
        email="kwame.copilot.actions@example.com",
        role="farmer",
    )
    buyer_token, buyer_actor_id = _create_session(
        client,
        name="Kojo Buyer",
        email="kojo.copilot.actions@example.com",
        role="buyer",
    )
    transporter_token, transporter_actor_id = _create_session(
        client,
        name="Yaw Transport",
        email="yaw.copilot.actions@example.com",
        role="transporter",
    )

    climate_repository = ClimateRepository(session)
    climate_repository.upsert_farm_profile(
        farm_id="farm-copilot-actions-1",
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
        alert_id="alert-copilot-actions-1",
        farm_id="farm-copilot-actions-1",
        actor_id=farmer_actor_id,
        country_code="GH",
        observation_id="obs-copilot-actions-1",
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
        listing_id="listing-copilot-actions-draft",
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
        listing_id="listing-copilot-actions-buyer",
        actor_id=seller_actor_id,
        country_code="GH",
        title="Premium maize for buyer confirmation",
        commodity="Maize",
        quantity_tons=7.5,
        price_amount=510.0,
        price_currency="GHS",
        location="Kumasi, GH",
        summary="Published listing used to verify buyer-side approval actions.",
    )
    marketplace_repository.publish_listing(listing=buyer_listing)
    negotiation_thread = marketplace_repository.create_negotiation_thread(
        thread_id="thread-copilot-actions-1",
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
        load_id="load-copilot-actions-1",
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
        shipment_id="shipment-copilot-actions-1",
        load_id=load.load_id,
        transporter_actor_id=transporter_actor_id,
        country_code="GH",
        vehicle_info={"plate_number": "GT-2204-26", "vehicle_type": "flatbed"},
        current_location_lat=9.41,
        current_location_lng=-0.85,
    )
    transport_repository.create_shipment_event(
        event_id="event-copilot-actions-1",
        shipment_id=shipment.shipment_id,
        actor_id=transporter_actor_id,
        event_type="assigned",
        event_at=datetime.now(tz=UTC),
        location_lat=9.41,
        location_lng=-0.85,
        notes="Assigned for copilot action coverage.",
    )
    session.commit()

    publish_resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/market/listings",
            "locale": "en-GH",
            "message": "Publish my cassava listing now",
            "transcript_entries": [],
            "context": {"listing_id": draft_listing.listing_id},
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert publish_resolution.status_code == 200
    publish_body = publish_resolution.json()
    assert publish_body["intent"] == "market.listings.publish"
    assert publish_body["status"] == "confirmation_required"
    assert publish_body["action"]["adapter"] == "market.listings.publish"

    publish_execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": publish_body["resolution_id"],
            "intent": publish_body["intent"],
            "adapter": publish_body["action"]["adapter"],
            "route_path": publish_body["route_path"],
            "decision": "confirm",
            "payload": publish_body["action"]["payload"],
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert publish_execution.status_code == 200
    assert publish_execution.json()["status"] == "completed"
    assert publish_execution.json()["result"]["listing"]["status"] == "published"

    climate_resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/climate/alerts",
            "locale": "en-GH",
            "message": "Acknowledge the open flood alert",
            "transcript_entries": [],
            "context": {"alert_id": "alert-copilot-actions-1"},
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert climate_resolution.status_code == 200
    climate_body = climate_resolution.json()
    assert climate_body["intent"] == "climate.alerts.acknowledge"

    climate_execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": climate_body["resolution_id"],
            "intent": climate_body["intent"],
            "adapter": climate_body["action"]["adapter"],
            "route_path": climate_body["route_path"],
            "decision": "confirm",
            "payload": climate_body["action"]["payload"],
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert climate_execution.status_code == 200
    assert climate_execution.json()["status"] == "completed"
    assert climate_execution.json()["result"]["climate_alert"]["status"] == "acknowledged"

    negotiation_resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/market/negotiations",
            "locale": "en-GH",
            "message": "Approve the pending offer",
            "transcript_entries": [],
            "context": {"thread_id": negotiation_thread.thread_id},
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert negotiation_resolution.status_code == 200
    negotiation_body = negotiation_resolution.json()
    assert negotiation_body["intent"] == "market.negotiations.confirm.approve"

    negotiation_execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": negotiation_body["resolution_id"],
            "intent": negotiation_body["intent"],
            "adapter": negotiation_body["action"]["adapter"],
            "route_path": negotiation_body["route_path"],
            "decision": "confirm",
            "payload": negotiation_body["action"]["payload"],
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert negotiation_execution.status_code == 200
    assert negotiation_execution.json()["status"] == "completed"
    assert negotiation_execution.json()["result"]["thread"]["status"] == "accepted"

    transport_resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/trucker",
            "locale": "en-GH",
            "message": "Mark the shipment picked up",
            "transcript_entries": [],
            "context": {"shipment_id": shipment.shipment_id},
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert transport_resolution.status_code == 200
    transport_body = transport_resolution.json()
    assert transport_body["action"]["adapter"] == "transport.shipments.events.create"

    transport_execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": transport_body["resolution_id"],
            "intent": transport_body["intent"],
            "adapter": transport_body["action"]["adapter"],
            "route_path": transport_body["route_path"],
            "decision": "confirm",
            "payload": transport_body["action"]["payload"],
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert transport_execution.status_code == 200
    assert transport_execution.json()["status"] == "completed"
    assert transport_execution.json()["result"]["shipment_status"] == "in_transit"

    advisory_resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/advisory/new",
            "locale": "en-GH",
            "message": "What should I check after heavy rain on cassava rows?",
            "transcript_entries": [],
            "context": {},
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert advisory_resolution.status_code == 200
    advisory_body = advisory_resolution.json()
    assert advisory_body["intent"] == "advisory.ask"
    assert advisory_body["status"] == "ready"

    advisory_execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": advisory_body["resolution_id"],
            "intent": advisory_body["intent"],
            "adapter": advisory_body["action"]["adapter"],
            "route_path": advisory_body["route_path"],
            "decision": "confirm",
            "payload": advisory_body["action"]["payload"],
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert advisory_execution.status_code == 200
    assert advisory_execution.json()["status"] == "completed"
    assert advisory_execution.json()["result"]["advisory_request"]["question_text"].startswith(
        "What should I check after heavy rain"
    )

    completed_events = session.execute(
        select(AuditEvent).where(AuditEvent.event_type == "copilot.execution.completed")
    ).scalars().all()
    assert len(completed_events) >= 5

    copilot_outbox_messages = session.execute(
        select(OutboxMessage).where(OutboxMessage.event_type == "copilot.action.completed")
    ).scalars().all()
    assert len(copilot_outbox_messages) >= 5


def test_copilot_escalation_creates_handoff_receipt(client, session) -> None:
    farmer_token, farmer_actor_id = _create_session(
        client,
        name="Akosua Farmer",
        email="akosua.copilot.escalate@example.com",
        role="farmer",
    )

    marketplace_repository = MarketplaceRepository(session)
    listing = marketplace_repository.create_listing(
        listing_id="listing-copilot-escalate-1",
        actor_id=farmer_actor_id,
        country_code="GH",
        title="Escalation test listing",
        commodity="Cassava",
        quantity_tons=2.0,
        price_amount=300.0,
        price_currency="GHS",
        location="Tamale, GH",
        summary="Listing used to verify escalation flow.",
    )
    session.commit()

    resolution = client.post(
        "/api/v1/copilot/resolve",
        json={
            "route_path": "/app/market/listings",
            "locale": "en-GH",
            "message": "Publish my listing now",
            "transcript_entries": [],
            "context": {"listing_id": listing.listing_id},
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert resolution.status_code == 200
    body = resolution.json()

    execution = client.post(
        "/api/v1/copilot/execute",
        json={
            "resolution_id": body["resolution_id"],
            "intent": body["intent"],
            "adapter": body["action"]["adapter"],
            "route_path": body["route_path"],
            "decision": "escalate",
            "payload": body["action"]["payload"],
            "note": "Human approval requested.",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert execution.status_code == 200
    execution_body = execution.json()
    assert execution_body["status"] == "escalated"
    assert execution_body["human_handoff"]["required"] is True

    handoff_event = session.execute(
        select(AuditEvent).where(AuditEvent.event_type == "copilot.execution.escalated")
    ).scalar_one()
    assert handoff_event.reason_code == "human_handoff_requested"

    handoff_outbox = session.execute(
        select(OutboxMessage).where(OutboxMessage.event_type == "copilot.handoff.requested")
    ).scalar_one()
    assert handoff_outbox.aggregate_id == body["resolution_id"]
