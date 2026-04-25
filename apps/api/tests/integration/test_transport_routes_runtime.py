from datetime import UTC, datetime

from app.db.repositories.identity import IdentityRepository


def _create_session(session, *, actor_id: str, display_name: str, email: str, role: str, country_code: str = "GH") -> str:
    identity_repository = IdentityRepository(session)
    identity_repository.ensure_membership(actor_id=actor_id, role=role, country_code=country_code)
    record = identity_repository.create_or_rotate_session(
        actor_id=actor_id,
        display_name=display_name,
        email=email,
        role=role,
        country_code=country_code,
    )
    identity_repository.grant_consent(
        actor_id=actor_id,
        country_code=country_code,
        policy_version="2026.04",
        scope_ids=["identity.core", "workflow.audit", "transport.logistics"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def test_transport_routes_cover_load_posting_assignment_tracking_and_delivery(client, session) -> None:
    farmer_token = _create_session(
        session,
        actor_id="actor-farmer-gh-transport",
        display_name="Kwame Farmer",
        email="kwame.transport@example.com",
        role="farmer",
    )
    transporter_token = _create_session(
        session,
        actor_id="actor-transporter-gh-transport",
        display_name="Yaw Transport",
        email="yaw.transport@example.com",
        role="transporter",
    )

    create_load = client.post(
        "/api/v1/transport/loads",
        json={
            "origin_location": "Tamale, GH",
            "destination_location": "Accra, GH",
            "commodity": "Cassava",
            "weight_tons": 6.4,
            "vehicle_type_required": "flatbed",
            "pickup_date": "2026-04-26",
            "delivery_deadline": "2026-04-27",
            "price_offer": 850,
            "price_currency": "GHS",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert create_load.status_code == 200
    load_id = create_load.json()["load_id"]
    assert create_load.json()["status"] == "posted"

    browse_loads = client.get(
        "/api/v1/transport/loads",
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert browse_loads.status_code == 200
    assert [item["load_id"] for item in browse_loads.json()["items"]] == [load_id]

    assign_load = client.post(
        f"/api/v1/transport/loads/{load_id}/assign",
        json={
            "vehicle_info": {"plate_number": "GT-4421-26", "vehicle_type": "flatbed"},
            "location_lat": 9.4075,
            "location_lng": -0.8533,
            "notes": "Heading to pickup point",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert assign_load.status_code == 200
    shipment_id = assign_load.json()["shipment_id"]
    assert assign_load.json()["status"] == "assigned"
    assert assign_load.json()["load"]["assigned_transporter_actor_id"] == "actor-transporter-gh-transport"

    pickup = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/events",
        json={
            "event_type": "picked_up",
            "location_lat": 9.4075,
            "location_lng": -0.8533,
            "notes": "Produce loaded and sealed",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert pickup.status_code == 200
    assert pickup.json()["status"] == "in_transit"
    assert [item["event_type"] for item in pickup.json()["events"]] == ["assigned", "picked_up"]

    delivered = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/deliver",
        json={
            "proof_of_delivery_url": "https://cdn.example.com/proof/cassava-load.jpg",
            "location_lat": 5.6037,
            "location_lng": -0.187,
            "notes": "Receiver signed proof",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert delivered.status_code == 200
    assert delivered.json()["status"] == "delivered"
    assert delivered.json()["proof_of_delivery_url"] == "https://cdn.example.com/proof/cassava-load.jpg"
    assert [item["event_type"] for item in delivered.json()["events"]] == ["assigned", "picked_up", "delivered"]

    farmer_shipments = client.get(
        "/api/v1/transport/shipments",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert farmer_shipments.status_code == 200
    assert [item["shipment_id"] for item in farmer_shipments.json()["items"]] == [shipment_id]


def test_transport_routes_enforce_role_and_scope_guards(client, session) -> None:
    farmer_token = _create_session(
        session,
        actor_id="actor-farmer-gh-transport-guard",
        display_name="Ama Farmer",
        email="ama.transport@example.com",
        role="farmer",
    )
    buyer_token = _create_session(
        session,
        actor_id="actor-buyer-gh-transport-guard",
        display_name="Kojo Buyer",
        email="kojo.transport@example.com",
        role="buyer",
    )

    create_load = client.post(
        "/api/v1/transport/loads",
        json={
            "origin_location": "Kumasi, GH",
            "destination_location": "Techiman, GH",
            "commodity": "Plantain",
            "weight_tons": 3.2,
            "vehicle_type_required": "pickup",
            "pickup_date": "2026-04-26",
            "delivery_deadline": "2026-04-27",
            "price_offer": 320,
            "price_currency": "GHS",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    load_id = create_load.json()["load_id"]

    assign = client.post(
        f"/api/v1/transport/loads/{load_id}/assign",
        json={"vehicle_info": {"plate_number": "BAD-100"}},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert assign.status_code == 403
    assert assign.json()["detail"]["error_code"] == "policy_denied"

    shipment_list = client.get(
        "/api/v1/transport/shipments",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert shipment_list.status_code == 200
    assert shipment_list.json()["items"] == []
