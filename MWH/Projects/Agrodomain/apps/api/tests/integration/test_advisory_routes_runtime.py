from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.advisory import AdvisoryRequestRecord, ReviewerDecisionRecord
from app.db.models.audit import AuditEvent


def _sign_in_and_consent(client, *, name: str, email: str, role: str, country_code: str) -> tuple[str, str]:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": name,
            "email": email,
            "role": role,
            "country_code": country_code,
        },
    )
    assert sign_in.status_code == 200
    token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]
    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.w1",
            "scope_ids": ["identity.core", "workflow.audit"],
            "captured_at": "2026-04-18T00:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert consent.status_code == 200
    return token, actor_id


def test_advisory_request_replay_stays_single_effect_and_reads_with_citations(client, session) -> None:
    token, actor_id = _sign_in_and_consent(
        client,
        name="Ama Mensah",
        email="ama.advisory@example.com",
        role="farmer",
        country_code="GH",
    )
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "advisory-integration-req-1",
            "idempotency_key": "advisory-idem-1",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-advisory-1",
            "occurred_at": "2026-04-18T08:00:00+00:00",
            "traceability": {"journey_ids": ["CJ-005"], "data_check_ids": ["DI-005"]},
        },
        "command": {
            "name": "advisory.requests.submit",
            "aggregate_ref": "advisory",
            "mutation_scope": "advisory.requests",
            "payload": {
                "topic": "soil moisture planning",
                "question_text": "What should I do about low soil moisture before replanting weak maize pockets?",
                "locale": "en-GH",
                "transcript_entries": [],
                "policy_context": {"crop": "maize", "sensitive_topics": []},
            },
        },
    }
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post("/api/v1/workflow/commands", json=payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "replayed"
    advisory_request_id = first.json()["result"]["advisory_request"]["advisory_request_id"]

    detail = client.get(f"/api/v1/advisory/requests/{advisory_request_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["citations"]
    assert detail.json()["confidence_band"] in {"medium", "high"}
    assert detail.json()["status"] == "delivered"

    listing = client.get("/api/v1/advisory/requests", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()["items"]) == 1

    assert session.execute(select(func.count()).select_from(AdvisoryRequestRecord)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(ReviewerDecisionRecord)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(AuditEvent)).scalar_one() >= 4


def test_hitl_required_response_stays_blocked_until_explicit_reviewer_decision(client, session) -> None:
    farmer_token, farmer_actor_id = _sign_in_and_consent(
        client,
        name="Kojo Farmer",
        email="kojo.advisory@example.com",
        role="farmer",
        country_code="GH",
    )
    reviewer_token, reviewer_actor_id = _sign_in_and_consent(
        client,
        name="Reviewer Admin",
        email="reviewer@example.com",
        role="admin",
        country_code="GH",
    )
    schema_version = get_envelope_schema_version()
    submit_payload = {
        "metadata": {
            "request_id": "advisory-integration-req-2",
            "idempotency_key": "advisory-idem-2",
            "actor_id": farmer_actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-advisory-2",
            "occurred_at": "2026-04-18T08:10:00+00:00",
            "traceability": {"journey_ids": ["CJ-005"], "data_check_ids": ["DI-005"]},
        },
        "command": {
            "name": "advisory.requests.submit",
            "aggregate_ref": "advisory",
            "mutation_scope": "advisory.requests",
            "payload": {
                "topic": "fall armyworm treatment",
                "question_text": "What pesticide dosage should I spray for fall armyworm this week?",
                "locale": "en-GH",
                "transcript_entries": [],
                "policy_context": {"crop": "maize", "sensitive_topics": ["pesticide"]},
            },
        },
    }
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}
    submit_response = client.post("/api/v1/workflow/commands", json=submit_payload, headers=farmer_headers)
    assert submit_response.status_code == 200
    advisory_request_id = submit_response.json()["result"]["advisory_request"]["advisory_request_id"]

    detail_before = client.get(f"/api/v1/advisory/requests/{advisory_request_id}", headers=farmer_headers)
    assert detail_before.status_code == 200
    assert detail_before.json()["status"] == "hitl_required"
    assert detail_before.json()["delivered_at"] is None
    assert detail_before.json()["reviewer_decision"]["outcome"] == "hitl_required"

    unauthorized_review = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "advisory-integration-req-3",
                "idempotency_key": "advisory-idem-3",
                "actor_id": farmer_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-advisory-3",
                "occurred_at": "2026-04-18T08:12:00+00:00",
                "traceability": {"journey_ids": ["EP-006"], "data_check_ids": ["DI-005"]},
            },
            "command": {
                "name": "advisory.reviewer.decide",
                "aggregate_ref": advisory_request_id,
                "mutation_scope": "advisory.review",
                "payload": {
                    "advisory_request_id": advisory_request_id,
                    "outcome": "approve",
                    "reason_code": "grounded_response_ready",
                    "note": "Farmer cannot self-approve.",
                },
            },
        },
        headers=farmer_headers,
    )
    assert unauthorized_review.status_code == 403

    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}
    reviewer_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "advisory-integration-req-4",
                "idempotency_key": "advisory-idem-4",
                "actor_id": reviewer_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-advisory-4",
                "occurred_at": "2026-04-18T08:13:00+00:00",
                "traceability": {"journey_ids": ["CJ-005"], "data_check_ids": ["DI-005"]},
            },
            "command": {
                "name": "advisory.reviewer.decide",
                "aggregate_ref": advisory_request_id,
                "mutation_scope": "advisory.review",
                "payload": {
                    "advisory_request_id": advisory_request_id,
                    "outcome": "approve",
                    "reason_code": "grounded_response_ready",
                    "note": "Approved after manual review.",
                    "transcript_link": "audit://manual-review/advisory-integration-req-4",
                },
            },
        },
        headers=reviewer_headers,
    )
    assert reviewer_response.status_code == 200

    detail_after = client.get(f"/api/v1/advisory/requests/{advisory_request_id}", headers=farmer_headers)
    assert detail_after.status_code == 200
    assert detail_after.json()["status"] == "delivered"
    assert detail_after.json()["delivered_at"] is not None
    assert detail_after.json()["reviewer_decision"]["outcome"] == "approve"
    assert detail_after.json()["reviewer_decision"]["actor_role"] == "admin"

    latest_decision = session.execute(
        select(ReviewerDecisionRecord).order_by(ReviewerDecisionRecord.id.desc())
    ).scalars().first()
    assert latest_decision is not None
    assert latest_decision.actor_role == "admin"
