from sqlalchemy import func, select

from app.db.models.audit import AuditEvent
from app.db.models.ledger import WalletLedgerEntry
from app.core.contracts_catalog import get_envelope_schema_version


class _FakePaymentProvider:
    provider_name = "paystack"

    def initialize_collection(
        self,
        *,
        amount_minor: int,
        currency: str,
        email: str,
        reference: str,
        callback_url: str | None,
        channels: list[str],
        metadata: dict[str, object],
    ):
        return type(
            "PaymentSession",
            (),
            {
                "provider": "paystack",
                "provider_mode": "test",
                "provider_reference": reference,
                "provider_status": "pending",
                "authorization_url": "https://checkout.paystack.com/test-session",
                "access_code": "test-access-code",
                "provider_transaction_id": None,
                "channels": channels,
                "raw_payload": {"status": True, "message": "Authorization URL created"},
                "last_error_code": None,
                "last_error_detail": None,
            },
        )()

    def verify_collection(self, *, provider_reference: str):
        return type(
            "PaymentSession",
            (),
            {
                "provider": "paystack",
                "provider_mode": "test",
                "provider_reference": provider_reference,
                "provider_status": "success",
                "authorization_url": None,
                "access_code": None,
                "provider_transaction_id": "4099260516",
                "channels": [],
                "raw_payload": {
                    "status": True,
                    "message": "Verification successful",
                    "data": {
                        "id": 4099260516,
                        "reference": provider_reference,
                        "status": "success",
                        "gateway_response": "Successful",
                    },
                },
                "last_error_code": None,
                "last_error_detail": "Successful",
            },
        )()


def _register_and_consent(
    client,
    *,
    display_name: str,
    email: str,
    role: str,
    country_code: str = "GH",
) -> tuple[str, str]:
    register = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": display_name,
            "email": email,
            "phone_number": f"+23324{abs(hash(email)) % 10_000_000:07d}",
            "password": "Harvest2026!",
            "role": role,
            "country_code": country_code,
        },
    )
    assert register.status_code == 200
    token = register.json()["access_token"]
    actor_id = register.json()["session"]["actor"]["actor_id"]
    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.eh5",
            "scope_ids": ["identity.core", "workflow.audit", "wallet.ledger", "wallet.escrow"],
            "captured_at": "2026-04-29T06:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert consent.status_code == 200
    return token, actor_id


def _payload(
    *,
    actor_id: str,
    command_name: str,
    payload: dict[str, object],
    aggregate_ref: str,
    mutation_scope: str,
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
            "occurred_at": "2026-04-29T06:00:00+00:00",
            "traceability": {"journey_ids": ["EH5-G1"], "data_check_ids": ["DI-EH5-01"]},
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


def _setup_accepted_thread(client) -> tuple[str, str, str, str, str]:
    seller_token, seller_actor_id = _register_and_consent(
        client,
        display_name="Ama Farmer",
        email="ama.wallet@example.com",
        role="farmer",
    )
    buyer_token, buyer_actor_id = _register_and_consent(
        client,
        display_name="Kojo Buyer",
        email="kojo.wallet@example.com",
        role="buyer",
    )

    create_listing = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id=seller_actor_id,
            command_name="market.listings.create",
            aggregate_ref="listing",
            mutation_scope="marketplace.listings",
            request_suffix="eh5-listing-create",
            payload={
                "title": "Premium cassava lot",
                "commodity": "Cassava",
                "quantity_tons": 4.2,
                "price_amount": 400,
                "price_currency": "GHS",
                "location": "Tamale, GH",
                "summary": "Premium cassava lot with pickup slots.",
            },
        ),
    )
    assert create_listing.status_code == 200
    listing_id = create_listing.json()["result"]["listing"]["listing_id"]
    publish_listing = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id=seller_actor_id,
            command_name="market.listings.publish",
            aggregate_ref=listing_id,
            mutation_scope="marketplace.listings",
            request_suffix="eh5-listing-publish",
            payload={"listing_id": listing_id},
        ),
    )
    assert publish_listing.status_code == 200
    create_thread = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id=buyer_actor_id,
            command_name="market.negotiations.create",
            aggregate_ref=listing_id,
            mutation_scope="marketplace.negotiations",
            request_suffix="eh5-thread-create",
            payload={
                "listing_id": listing_id,
                "offer_amount": 400,
                "offer_currency": "GHS",
                "note": "Buyer offer",
            },
        ),
    )
    assert create_thread.status_code == 200
    thread_id = create_thread.json()["result"]["thread"]["thread_id"]
    confirm_request = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id=seller_actor_id,
            command_name="market.negotiations.confirm.request",
            aggregate_ref=thread_id,
            mutation_scope="marketplace.negotiations",
            request_suffix="eh5-thread-confirm-request",
            payload={
                "thread_id": thread_id,
                "required_confirmer_actor_id": buyer_actor_id,
                "note": "Please confirm",
            },
        ),
    )
    assert confirm_request.status_code == 200
    confirm_approve = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id=buyer_actor_id,
            command_name="market.negotiations.confirm.approve",
            aggregate_ref=thread_id,
            mutation_scope="marketplace.negotiations",
            request_suffix="eh5-thread-confirm-approve",
            payload={"thread_id": thread_id, "note": "Approved"},
        ),
    )
    assert confirm_approve.status_code == 200
    return seller_token, buyer_token, seller_actor_id, buyer_actor_id, thread_id


def test_paystack_collection_route_funds_escrow_after_successful_sync(client, session) -> None:
    client.app.state.payment_provider = _FakePaymentProvider()
    seller_token, buyer_token, _seller_actor_id, buyer_actor_id, thread_id = _setup_accepted_thread(client)

    initiate_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id=buyer_actor_id,
            command_name="wallets.escrows.initiate",
            aggregate_ref=thread_id,
            mutation_scope="wallet.escrow",
            request_suffix="eh5-escrow-initiate",
            payload={"thread_id": thread_id, "note": "Open provider-backed escrow"},
        ),
    )
    assert initiate_escrow.status_code == 200
    escrow_id = initiate_escrow.json()["result"]["escrow"]["escrow_id"]

    initialize = client.post(
        "/api/v1/wallet/payments/collections",
        json={"escrow_id": escrow_id},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert initialize.status_code == 200
    payment_id = initialize.json()["payment"]["payment_id"]
    assert initialize.json()["payment"]["provider"] == "paystack"
    assert initialize.json()["payment"]["local_status"] == "pending"

    escrow_after_init = client.get(
        f"/api/v1/wallet/escrows/{escrow_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert escrow_after_init.status_code == 200
    assert escrow_after_init.json()["state"] == "partner_pending"

    sync = client.post(
        f"/api/v1/wallet/payments/collections/{payment_id}/sync",
        json={"note": "Sandbox payment settled"},
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert sync.status_code == 200
    assert sync.json()["payment"]["local_status"] == "funded"
    assert sync.json()["escrow"]["state"] == "funded"

    wallet = client.get(
        "/api/v1/wallet/summary?currency=GHS",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert wallet.status_code == 200
    assert wallet.json()["available_balance"] == 0
    assert wallet.json()["held_balance"] == 400

    listed = client.get(
        "/api/v1/wallet/payments/collections",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert listed.status_code == 200
    assert listed.json()["items"][0]["payment_id"] == payment_id

    reasons = [
        entry.reason
        for entry in session.execute(
            select(WalletLedgerEntry)
            .where(WalletLedgerEntry.wallet_actor_id == buyer_actor_id)
            .order_by(WalletLedgerEntry.entry_sequence.asc())
        )
        .scalars()
        .all()
    ]
    assert reasons == ["external_collection_settled", "escrow_funded"]
    assert session.execute(
        select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type == "payment.collection.synced")
    ).scalar_one() == 1
