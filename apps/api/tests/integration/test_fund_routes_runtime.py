from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.contracts_catalog import get_envelope_schema_version
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
        scope_ids=["identity.core", "workflow.audit", "finance.investments"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def _payload(
    *,
    actor_id: str,
    command_name: str,
    payload: dict[str, Any],
    aggregate_ref: str,
    mutation_scope: str,
    journey_id: str,
    request_suffix: str,
) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    return {
        "metadata": {
            "request_id": f"req-{request_suffix}",
            "idempotency_key": f"idem-{request_suffix}",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": f"corr-{request_suffix}",
            "occurred_at": "2026-04-24T22:30:00+00:00",
            "traceability": {"journey_ids": [journey_id], "data_check_ids": ["QG-04"]},
        },
        "command": {
            "name": command_name,
            "aggregate_ref": aggregate_ref,
            "mutation_scope": mutation_scope,
            "payload": payload,
        },
    }


def _post(client, *, token: str, payload: dict[str, object]):
    return client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_fund_routes_expose_wallet_linked_opportunity_and_investment_flow(client, session) -> None:
    farmer_token = _create_session(session, actor_id="actor-farmer-gh-esi", role="farmer")
    investor_token = _create_session(session, actor_id="actor-investor-gh-kwame", role="investor")

    fund_wallet = _post(
        client,
        token=investor_token,
        payload=_payload(
            actor_id="actor-investor-gh-kwame",
            command_name="wallets.fund",
            aggregate_ref="wallet",
            mutation_scope="wallet.ledger",
            journey_id="EP-005",
            request_suffix="fund-wallet-seed",
            payload={
                "wallet_actor_id": "actor-investor-gh-kwame",
                "country_code": "GH",
                "currency": "GHS",
                "amount": 1000,
                "reference_type": "manual_seed",
                "reference_id": "seed-rb051",
            },
        ),
    )
    assert fund_wallet.status_code == 200

    create_opportunity = _post(
        client,
        token=farmer_token,
        payload=_payload(
            actor_id="actor-farmer-gh-esi",
            command_name="fund.opportunities.create",
            aggregate_ref="funding-opportunity",
            mutation_scope="fund.opportunities",
            journey_id="EP-005",
            request_suffix="fund-opportunity-create",
            payload={
                "farm_id": "farm-gh-esi-01",
                "currency": "GHS",
                "title": "Tomato greenhouse expansion",
                "description": "Working capital to expand protected cultivation and irrigation for the next cycle.",
                "funding_goal": 500,
                "expected_return_pct": 16,
                "timeline_months": 5,
                "min_investment": 100,
                "max_investment": 500,
            },
        ),
    )
    assert create_opportunity.status_code == 200
    opportunity_id = create_opportunity.json()["result"]["opportunity"]["opportunity_id"]

    public_list = client.get(
        "/api/v1/fund/opportunities",
        headers={"Authorization": f"Bearer {investor_token}"},
    )
    assert public_list.status_code == 200
    assert [item["opportunity_id"] for item in public_list.json()["items"]] == [opportunity_id]
    assert public_list.json()["items"][0]["percent_funded"] == 0

    invest = _post(
        client,
        token=investor_token,
        payload=_payload(
            actor_id="actor-investor-gh-kwame",
            command_name="fund.investments.create",
            aggregate_ref=opportunity_id,
            mutation_scope="fund.investments",
            journey_id="EP-005",
            request_suffix="fund-investment-create",
            payload={
                "opportunity_id": opportunity_id,
                "amount": 500,
                "currency": "GHS",
                "note": "Fund the greenhouse buildout",
            },
        ),
    )
    assert invest.status_code == 200
    investment_id = invest.json()["result"]["investment"]["investment_id"]
    assert invest.json()["result"]["opportunity"]["status"] == "funded"
    assert invest.json()["result"]["wallet"]["available_balance"] == 500
    assert invest.json()["result"]["wallet"]["held_balance"] == 500

    detail = client.get(
        f"/api/v1/fund/opportunities/{opportunity_id}",
        headers={"Authorization": f"Bearer {investor_token}"},
    )
    assert detail.status_code == 200
    assert detail.json()["status"] == "funded"
    assert detail.json()["current_amount"] == 500
    assert detail.json()["percent_funded"] == 100

    list_investments = client.get(
        "/api/v1/fund/investments",
        headers={"Authorization": f"Bearer {investor_token}"},
    )
    assert list_investments.status_code == 200
    assert [item["investment_id"] for item in list_investments.json()["items"]] == [investment_id]
    assert list_investments.json()["items"][0]["opportunity"]["opportunity_id"] == opportunity_id

    withdraw = _post(
        client,
        token=investor_token,
        payload=_payload(
            actor_id="actor-investor-gh-kwame",
            command_name="fund.investments.withdraw",
            aggregate_ref=investment_id,
            mutation_scope="fund.investments",
            journey_id="EP-005",
            request_suffix="fund-investment-withdraw",
            payload={"investment_id": investment_id, "note": "Exit position early"},
        ),
    )
    assert withdraw.status_code == 200
    assert withdraw.json()["result"]["investment"]["status"] == "withdrawn"
    assert withdraw.json()["result"]["penalty_amount"] == 25
    assert withdraw.json()["result"]["wallet"]["available_balance"] == 975
    assert withdraw.json()["result"]["wallet"]["held_balance"] == 0
    assert withdraw.json()["result"]["opportunity"]["status"] == "open"
    assert withdraw.json()["result"]["opportunity"]["current_amount"] == 0

    investment_detail = client.get(
        f"/api/v1/fund/investments/{investment_id}",
        headers={"Authorization": f"Bearer {investor_token}"},
    )
    assert investment_detail.status_code == 200
    assert investment_detail.json()["actual_return_amount"] == 475
    assert investment_detail.json()["penalty_amount"] == 25

    wallet_transactions = client.get(
        "/api/v1/wallet/transactions",
        headers={"Authorization": f"Bearer {investor_token}"},
    )
    assert wallet_transactions.status_code == 200
    assert [item["reason"] for item in wallet_transactions.json()["items"]] == [
        "wallet_funded",
        "fund_invested",
        "fund_withdrawn",
    ]


def test_published_farmer_listing_creates_public_fund_opportunity(client, session) -> None:
    farmer_token = _create_session(session, actor_id="actor-farmer-gh-fundlink", role="farmer")
    buyer_token = _create_session(session, actor_id="actor-buyer-gh-fundlink", role="buyer")

    create_listing = _post(
        client,
        token=farmer_token,
        payload=_payload(
            actor_id="actor-farmer-gh-fundlink",
            command_name="market.listings.create",
            aggregate_ref="listing",
            mutation_scope="marketplace.listings",
            journey_id="CJ-002",
            request_suffix="listing-create-fund-link",
            payload={
                "title": "Fund-linked maize cycle",
                "commodity": "Maize",
                "quantity_tons": 8,
                "price_amount": 250,
                "price_currency": "GHS",
                "location": "Tamale, GH",
                "summary": "Published listing should surface as a canonical AgroFund opportunity.",
            },
        ),
    )
    assert create_listing.status_code == 200
    listing_id = create_listing.json()["result"]["listing"]["listing_id"]

    publish_listing = _post(
        client,
        token=farmer_token,
        payload=_payload(
            actor_id="actor-farmer-gh-fundlink",
            command_name="market.listings.publish",
            aggregate_ref=listing_id,
            mutation_scope="marketplace.listings",
            journey_id="CJ-003",
            request_suffix="listing-publish-fund-link",
            payload={"listing_id": listing_id},
        ),
    )
    assert publish_listing.status_code == 200

    list_opportunities = client.get(
        f"/api/v1/fund/opportunities?q={listing_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert list_opportunities.status_code == 200
    assert len(list_opportunities.json()["items"]) == 1
    opportunity = list_opportunities.json()["items"][0]
    assert opportunity["farm_id"] == listing_id
    assert opportunity["actor_id"] == "actor-farmer-gh-fundlink"
    assert opportunity["currency"] == "GHS"
    assert opportunity["title"] == "Fund-linked maize cycle"
    assert opportunity["status"] == "open"
    assert opportunity["min_investment"] <= 300 <= opportunity["max_investment"]
