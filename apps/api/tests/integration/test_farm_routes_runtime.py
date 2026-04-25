from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

from app.db.models.audit import AuditEvent
from app.db.repositories.identity import IdentityRepository


def _create_session(session, *, actor_id: str, role: str, country_code: str = "GH") -> str:
    identity_repository = IdentityRepository(session)
    identity_repository.ensure_membership(actor_id=actor_id, role=role, country_code=country_code)
    record = identity_repository.create_or_rotate_session(
        actor_id=actor_id,
        display_name=actor_id,
        email=f"{actor_id}@example.com",
        role=role,
        country_code=country_code,
    )
    identity_repository.grant_consent(
        actor_id=actor_id,
        country_code=country_code,
        policy_version="2026.04",
        scope_ids=["identity.core", "workflow.audit", "farm.runtime"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def test_farm_routes_support_r6_management_flow(client, session) -> None:
    token = _create_session(session, actor_id="actor-farmer-gh-r6", role="farmer")

    farm_response = client.post(
        "/api/v1/farms",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "farm_name": "R6 Demo Farm",
            "district": "Tamale",
            "crop_type": "Maize",
            "hectares": 8.4,
            "latitude": 9.41,
            "longitude": -0.84,
            "metadata": {"region": "Northern"},
        },
    )
    assert farm_response.status_code == 200
    farm_id = farm_response.json()["farm_id"]
    assert farm_response.json()["summary"]["total_fields"] == 0

    field_response = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "East Block",
            "boundary_geojson": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-0.844, 9.404],
                        [-0.842, 9.404],
                        [-0.842, 9.402],
                        [-0.844, 9.402],
                        [-0.844, 9.404],
                    ]
                ],
            },
            "area_hectares": 5.2,
            "soil_type": "loam",
            "irrigation_type": "drip",
            "current_crop": "maize",
            "planting_date": "2026-04-10",
            "expected_harvest_date": "2026-08-02",
            "status": "active",
        },
    )
    assert field_response.status_code == 200
    field_payload = field_response.json()
    field_id = field_payload["field_id"]
    assert field_payload["insurance_eligible"] is True
    assert field_payload["active_crop_cycle"]["status"] == "active"
    crop_cycle_id = field_payload["active_crop_cycle"]["crop_cycle_id"]

    input_response = client.post(
        f"/api/v1/farms/{farm_id}/inputs",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "input_type": "fertilizer",
            "name": "NPK 15-15-15",
            "quantity": 12,
            "unit": "bag",
            "cost": 1400,
            "supplier": "Tamale Agro",
            "purchase_date": "2026-04-01",
            "expiry_date": "2027-04-01",
        },
    )
    assert input_response.status_code == 200
    input_id = input_response.json()["input_id"]

    activity_response = client.post(
        f"/api/v1/farms/{farm_id}/activities",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "field_id": field_id,
            "activity_type": "fertilizing",
            "date": "2026-04-18",
            "description": "Top dressing after rain window",
            "inputs_used": [{"input_id": input_id, "quantity": 2.5, "unit": "bag"}],
            "labor_hours": 5,
            "cost": 210,
            "notes": "Applied before storm watch",
        },
    )
    assert activity_response.status_code == 200
    assert activity_response.json()["field_id"] == field_id

    crop_cycle_update = client.put(
        f"/api/v1/farms/{farm_id}/crop-cycles/{crop_cycle_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "field_id": field_id,
            "crop_type": "maize",
            "variety": "Obaatanpa",
            "planting_date": "2026-04-10",
            "harvest_date": "2026-08-02",
            "yield_tons": 7.3,
            "revenue": 4800,
            "status": "harvested",
        },
    )
    assert crop_cycle_update.status_code == 200
    assert crop_cycle_update.json()["status"] == "harvested"
    assert crop_cycle_update.json()["yield_tons"] == 7.3

    inputs_list = client.get(
        f"/api/v1/farms/{farm_id}/inputs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert inputs_list.status_code == 200
    assert inputs_list.json()["items"][0]["quantity_used"] == 2.5
    assert inputs_list.json()["items"][0]["quantity_remaining"] == 9.5

    farm_detail = client.get(
        f"/api/v1/farms/{farm_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert farm_detail.status_code == 200
    summary = farm_detail.json()["summary"]
    assert summary["total_fields"] == 1
    assert summary["inventory_count"] == 1
    assert summary["activity_count"] == 1
    assert summary["harvested_crop_cycles"] == 1
    assert summary["total_revenue"] == 4800


def test_farm_routes_enforce_actor_scope_and_audit_rejections(client, session) -> None:
    farmer_token = _create_session(session, actor_id="actor-farmer-gh-owner", role="farmer")
    outsider_token = _create_session(session, actor_id="actor-farmer-gh-outsider", role="farmer")
    buyer_token = _create_session(session, actor_id="actor-buyer-gh-r6", role="buyer")

    farm_response = client.post(
        "/api/v1/farms",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "farm_name": "Owner Farm",
            "district": "Tamale",
            "crop_type": "Soy",
            "hectares": 3.1,
        },
    )
    assert farm_response.status_code == 200
    farm_id = farm_response.json()["farm_id"]

    outsider_detail = client.get(
        f"/api/v1/farms/{farm_id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert outsider_detail.status_code == 404

    buyer_create = client.post(
        "/api/v1/farms",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "farm_name": "Buyer Should Fail",
            "district": "Tamale",
            "crop_type": "Maize",
            "hectares": 1.5,
        },
    )
    assert buyer_create.status_code == 403
    assert buyer_create.json()["detail"]["error_code"] == "policy_denied"

    invalid_field = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "name": "Bad Boundary",
            "boundary_geojson": {"type": "Point", "coordinates": [-0.84, 9.4]},
            "area_hectares": 2.0,
            "status": "active",
        },
    )
    assert invalid_field.status_code == 422
    assert invalid_field.json()["detail"]["error_code"] == "invalid_payload"

    rejection_reasons = {
        item.reason_code
        for item in session.execute(
            select(AuditEvent).where(AuditEvent.event_type == "farm.request.rejected")
        ).scalars()
    }
    assert "farm_write_forbidden" in rejection_reasons
    assert "unsupported_boundary_geojson" in rejection_reasons
