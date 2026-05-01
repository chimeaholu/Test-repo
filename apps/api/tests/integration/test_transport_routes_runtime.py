from datetime import UTC, datetime, timedelta

from app.core.config import Settings
from app.db.models.platform import IdentityAccount
from app.db.repositories.identity import IdentityRepository


def _create_session(session, *, actor_id: str, display_name: str, email: str, role: str, country_code: str = "GH") -> str:
    identity_repository = IdentityRepository(session)
    account = identity_repository.get_account_by_actor(actor_id)
    if account is None:
        session.add(
            IdentityAccount(
                actor_id=actor_id,
                display_name=display_name,
                email=email,
                phone_number=None,
                home_country_code=country_code,
                locale=f"en-{country_code}",
                password_recovery_required=False,
            )
        )
        session.flush()
    identity_repository.ensure_membership(actor_id=actor_id, role=role, country_code=country_code)
    raw_token, record = identity_repository.issue_session(
        settings=Settings(environment="test"),
        actor_id=actor_id,
        role=role,
        country_code=country_code,
        issued_via="test_fixture",
    )
    identity_repository.grant_consent(
        actor_id=actor_id,
        country_code=country_code,
        policy_version="2026.04",
        scope_ids=["identity.core", "workflow.audit", "transport.logistics"],
        captured_at=datetime.now(tz=UTC),
        session_id=record.session_id,
    )
    session.commit()
    return raw_token


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
    assert create_load.json()["route"]["distance_km"] > 0
    assert create_load.json()["route"]["provider_mode"] == "fallback"

    browse_loads = client.get(
        "/api/v1/transport/loads",
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert browse_loads.status_code == 200
    assert [item["load_id"] for item in browse_loads.json()["items"]] == [load_id]
    assert browse_loads.json()["items"][0]["route"]["duration_minutes"] >= 45

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
    assert assign_load.json()["route"]["distance_km"] > 0

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


def test_transport_routes_block_checkpoint_before_transit(client, session) -> None:
    pickup_date = (datetime.now(tz=UTC).date() + timedelta(days=1)).isoformat()
    delivery_deadline = (datetime.now(tz=UTC).date() + timedelta(days=2)).isoformat()
    farmer_token = _create_session(
        session,
        actor_id="actor-farmer-gh-transport-checkpoint",
        display_name="Checkpoint Farmer",
        email="checkpoint.farmer@example.com",
        role="farmer",
    )
    transporter_token = _create_session(
        session,
        actor_id="actor-transporter-gh-transport-checkpoint",
        display_name="Checkpoint Transporter",
        email="checkpoint.transporter@example.com",
        role="transporter",
    )

    create_load = client.post(
        "/api/v1/transport/loads",
        json={
            "origin_location": "Tamale, GH",
            "destination_location": "Accra, GH",
            "commodity": "Yam",
            "weight_tons": 4.2,
            "vehicle_type_required": "flatbed",
            "pickup_date": pickup_date,
            "delivery_deadline": delivery_deadline,
            "price_offer": 650,
            "price_currency": "GHS",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    load_id = create_load.json()["load_id"]
    assign_load = client.post(
        f"/api/v1/transport/loads/{load_id}/assign",
        json={"vehicle_info": {"plate_number": "GT-4421-26", "vehicle_type": "flatbed"}},
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    shipment_id = assign_load.json()["shipment_id"]

    checkpoint = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/events",
        json={
          "event_type": "checkpoint",
          "notes": "Attempted checkpoint before pickup",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )

    assert checkpoint.status_code == 409
    assert checkpoint.json()["detail"]["error_code"] == "transport_shipment_not_in_transit"


def test_transport_metrics_capture_sla_and_exception_signals(client, session) -> None:
    pickup_date = (datetime.now(tz=UTC).date() + timedelta(days=1)).isoformat()
    delivery_deadline = (datetime.now(tz=UTC).date() + timedelta(days=3)).isoformat()
    farmer_token = _create_session(
        session,
        actor_id="actor-farmer-gh-transport-metrics",
        display_name="Metrics Farmer",
        email="metrics.farmer@example.com",
        role="farmer",
    )
    transporter_token = _create_session(
        session,
        actor_id="actor-transporter-gh-transport-metrics",
        display_name="Metrics Transporter",
        email="metrics.transporter@example.com",
        role="transporter",
    )

    create_load = client.post(
        "/api/v1/transport/loads",
        json={
            "origin_location": "Tamale, GH",
            "destination_location": "Accra, GH",
            "commodity": "Maize",
            "weight_tons": 6.4,
            "vehicle_type_required": "flatbed",
            "pickup_date": pickup_date,
            "delivery_deadline": delivery_deadline,
            "price_offer": 850,
            "price_currency": "GHS",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    load_id = create_load.json()["load_id"]

    assign_load = client.post(
        f"/api/v1/transport/loads/{load_id}/assign",
        json={
            "vehicle_info": {"plate_number": "GT-5521-26", "vehicle_type": "flatbed"},
            "location_lat": 9.4075,
            "location_lng": -0.8533,
            "notes": "Heading to pickup point",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    shipment_id = assign_load.json()["shipment_id"]

    pickup = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/events",
        json={
            "event_type": "picked_up",
            "exception_code": "breakdown",
            "severity": "high",
            "delay_minutes": 95,
            "location_lat": 9.4075,
            "location_lng": -0.8533,
            "notes": "Engine issue after loading; backup vehicle dispatched.",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert pickup.status_code == 200

    delivered = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/deliver",
        json={
            "proof_of_delivery_url": "https://cdn.example.com/proof/metrics-load.jpg",
            "damage_reported": True,
            "location_lat": 5.6037,
            "location_lng": -0.187,
            "notes": "Receiver signed proof",
            "recipient_name": "Abena Receiver",
        },
        headers={"Authorization": f"Bearer {transporter_token}"},
    )
    assert delivered.status_code == 200

    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    body = metrics_response.text
    transition_lines = [
        line for line in body.splitlines() if line.startswith("agro_api_transport_shipment_transition_total{")
    ]
    exception_lines = [
        line for line in body.splitlines() if line.startswith("agro_api_transport_exception_total{")
    ]
    assert any(
        'action="assigned"' in line
        and 'shipment_status="assigned"' in line
        and 'sla_state="on_track"' in line
        and 'country_code="GH"' in line
        and line.endswith(" 1.0")
        for line in transition_lines
    )
    assert any(
        'action="picked_up"' in line
        and 'shipment_status="in_transit"' in line
        and 'sla_state="on_track"' in line
        and 'country_code="GH"' in line
        and line.endswith(" 1.0")
        for line in transition_lines
    )
    assert any(
        'action="delivered"' in line
        and 'shipment_status="delivered"' in line
        and 'sla_state="met"' in line
        and 'country_code="GH"' in line
        and line.endswith(" 1.0")
        for line in transition_lines
    )
    assert any(
        'exception_code="breakdown"' in line
        and 'severity="high"' in line
        and 'country_code="GH"' in line
        and line.endswith(" 1.0")
        for line in exception_lines
    )
    assert any(
        'exception_code="damage_reported"' in line
        and 'severity="high"' in line
        and 'country_code="GH"' in line
        and line.endswith(" 1.0")
        for line in exception_lines
    )
    assert 'agro_api_errors_total{error_type="exception_breakdown",surface="transport"} 1.0' in body


def test_transport_dispatch_board_matches_and_reassignment_workflow(client, session) -> None:
    farmer_token = _create_session(
        session,
        actor_id="actor-farmer-gh-dispatch",
        display_name="Dispatch Farmer",
        email="dispatch.farmer@example.com",
        role="farmer",
    )
    cooperative_token = _create_session(
        session,
        actor_id="actor-cooperative-gh-dispatch",
        display_name="Dispatch Cooperative",
        email="dispatch.cooperative@example.com",
        role="cooperative",
    )
    _create_session(
        session,
        actor_id="actor-transporter-gh-a",
        display_name="Alpha Carrier",
        email="alpha.carrier@example.com",
        role="transporter",
    )
    _create_session(
        session,
        actor_id="actor-transporter-gh-b",
        display_name="Beta Carrier",
        email="beta.carrier@example.com",
        role="transporter",
    )

    create_load = client.post(
        "/api/v1/transport/loads",
        json={
            "origin_location": "Tamale, GH",
            "destination_location": "Accra, GH",
            "commodity": "Groundnut",
            "weight_tons": 7.2,
            "vehicle_type_required": "flatbed",
            "pickup_date": "2026-04-26",
            "delivery_deadline": "2026-04-27",
            "price_offer": 990,
            "price_currency": "GHS",
        },
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    load_id = create_load.json()["load_id"]

    match_response = client.get(
        f"/api/v1/transport/loads/{load_id}/matches",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert match_response.status_code == 200
    assert match_response.json()["graph_context_used"] is False
    assert match_response.json()["fallback_strategy"] == "graph_independent_membership_runtime_heuristics"
    assert len(match_response.json()["items"]) >= 2

    dispatch_assign = client.post(
        f"/api/v1/transport/loads/{load_id}/dispatch-assign",
        json={
            "transporter_actor_id": "actor-transporter-gh-a",
            "vehicle_info": {"plate_number": "GT-1001-26", "vehicle_type": "flatbed"},
            "location_lat": 9.4075,
            "location_lng": -0.8533,
            "notes": "Assigned from cooperative board",
        },
        headers={"Authorization": f"Bearer {cooperative_token}"},
    )
    assert dispatch_assign.status_code == 200
    shipment_id = dispatch_assign.json()["shipment_id"]
    assert dispatch_assign.json()["transporter_actor_id"] == "actor-transporter-gh-a"

    board = client.get(
        "/api/v1/transport/dispatch/board",
        headers={"Authorization": f"Bearer {cooperative_token}"},
    )
    assert board.status_code == 200
    assert board.json()["summary"]["assigned_shipments"] >= 1
    board_item = next(item for item in board.json()["items"] if item["load"]["load_id"] == load_id)
    assert board_item["top_matches"][0]["fallback_strategy"] == "graph_independent_membership_runtime_heuristics"
    assert board_item["shipment"]["shipment_id"] == shipment_id

    reassign = client.post(
        f"/api/v1/transport/shipments/{shipment_id}/reassign",
        json={
            "transporter_actor_id": "actor-transporter-gh-b",
            "vehicle_info": {"plate_number": "GT-2002-26", "vehicle_type": "flatbed"},
            "location_lat": 8.5,
            "location_lng": -0.2,
            "notes": "Closer truck selected",
        },
        headers={"Authorization": f"Bearer {cooperative_token}"},
    )
    assert reassign.status_code == 200
    assert reassign.json()["transporter_actor_id"] == "actor-transporter-gh-b"
    assert [item["event_type"] for item in reassign.json()["events"]] == ["assigned", "reassigned"]
