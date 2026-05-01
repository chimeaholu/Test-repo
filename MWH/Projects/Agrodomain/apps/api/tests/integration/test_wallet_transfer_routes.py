from datetime import UTC, datetime

from app.core.contracts_catalog import get_envelope_schema_version
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
        scope_ids=["identity.core", "workflow.audit"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def _fund_wallet(client, token: str, actor_id: str, amount: float) -> None:
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": f"req-{actor_id}-fund",
            "idempotency_key": f"idem-{actor_id}-fund",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": f"corr-{actor_id}-fund",
            "occurred_at": "2026-04-24T02:00:00+00:00",
            "traceability": {"journey_ids": ["CJ-004"], "data_check_ids": ["DI-003"]},
        },
        "command": {
            "name": "wallets.fund",
            "aggregate_ref": "wallet",
            "mutation_scope": "wallet.ledger",
            "payload": {
                "wallet_actor_id": actor_id,
                "country_code": "GH",
                "currency": "GHS",
                "amount": amount,
                "reference_type": "deposit",
                "reference_id": f"dep-{actor_id}",
                "note": "Wallet top up",
                "reconciliation_marker": f"rcn-{actor_id}",
            },
        },
    }
    response = client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_wallet_transfer_route_supports_recipient_search_and_dual_ledger_updates(client, session) -> None:
    sender_token = _create_session(
        session,
        actor_id="actor-investor-gh-kojo",
        display_name="Kojo Investor",
        email="kojo@example.com",
        role="investor",
    )
    recipient_token = _create_session(
        session,
        actor_id="actor-farmer-gh-ama",
        display_name="Ama Farmer",
        email="ama@example.com",
        role="farmer",
    )

    _fund_wallet(client, sender_token, "actor-investor-gh-kojo", 900)

    search = client.get(
        "/api/v1/identity/actors/search",
        params={"q": "ama"},
        headers={"Authorization": f"Bearer {sender_token}"},
    )
    assert search.status_code == 200
    assert search.json()["items"][0]["actor_id"] == "actor-farmer-gh-ama"

    transfer = client.post(
        "/api/v1/wallet/transfers",
        json={
            "recipient_actor_id": "actor-farmer-gh-ama",
            "currency": "GHS",
            "amount": 250,
            "note": "Farm investment test",
            "reference": "fund-r5-001",
        },
        headers={"Authorization": f"Bearer {sender_token}"},
    )
    assert transfer.status_code == 200
    assert transfer.json()["transfer"]["reference"] == "fund-r5-001"
    assert transfer.json()["wallet"]["available_balance"] == 650

    sender_history = client.get(
        "/api/v1/wallet/transactions?currency=GHS",
        headers={"Authorization": f"Bearer {sender_token}"},
    )
    recipient_history = client.get(
        "/api/v1/wallet/transactions?currency=GHS",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )

    sender_reasons = [item["reason"] for item in sender_history.json()["items"]]
    recipient_reasons = [item["reason"] for item in recipient_history.json()["items"]]

    assert "wallet_transfer_sent" in sender_reasons
    assert "wallet_transfer_received" in recipient_reasons
