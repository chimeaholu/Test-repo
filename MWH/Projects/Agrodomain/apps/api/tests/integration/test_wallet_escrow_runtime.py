from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.ledger import EscrowRecord, EscrowTimelineEntry, WalletLedgerEntry
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
        scope_ids=["identity.core", "workflow.audit"],
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
    data_checks: list[str] | None = None,
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
            "occurred_at": "2026-04-18T19:00:00+00:00",
            "traceability": {"journey_ids": [journey_id], "data_check_ids": data_checks or []},
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


def _setup_accepted_thread(client, session) -> tuple[str, str, str]:
    seller_token = _create_session(
        session, actor_id="actor-farmer-gh-ama", role="farmer", country_code="GH"
    )
    buyer_token = _create_session(
        session, actor_id="actor-buyer-gh-kojo", role="buyer", country_code="GH"
    )

    create_listing = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="market.listings.create",
            aggregate_ref="listing",
            mutation_scope="marketplace.listings",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-listing-create",
            payload={
                "title": "Premium cassava lot",
                "commodity": "Cassava",
                "quantity_tons": 4.2,
                "price_amount": 420,
                "price_currency": "GHS",
                "location": "Tamale, GH",
                "summary": "Premium cassava lot with verified harvest sheet and pickup slots.",
            },
        ),
    )
    listing_id = create_listing.json()["result"]["listing"]["listing_id"]
    publish_listing = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="market.listings.publish",
            aggregate_ref=listing_id,
            mutation_scope="marketplace.listings",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-listing-publish",
            payload={"listing_id": listing_id},
        ),
    )
    assert publish_listing.status_code == 200

    create_thread = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="market.negotiations.create",
            aggregate_ref=listing_id,
            mutation_scope="marketplace.negotiations",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-thread-create",
            payload={
                "listing_id": listing_id,
                "offer_amount": 400,
                "offer_currency": "GHS",
                "note": "Buyer offer",
            },
        ),
    )
    thread_id = create_thread.json()["result"]["thread"]["thread_id"]

    confirm_request = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="market.negotiations.confirm.request",
            aggregate_ref=thread_id,
            mutation_scope="marketplace.negotiations",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-thread-confirm-request",
            payload={
                "thread_id": thread_id,
                "required_confirmer_actor_id": "actor-buyer-gh-kojo",
                "note": "Please confirm",
            },
        ),
    )
    assert confirm_request.status_code == 200

    confirm_approve = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="market.negotiations.confirm.approve",
            aggregate_ref=thread_id,
            mutation_scope="marketplace.negotiations",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-thread-confirm-approve",
            payload={"thread_id": thread_id, "note": "Approved"},
        ),
    )
    assert confirm_approve.status_code == 200
    return seller_token, buyer_token, thread_id


def test_cj004_wallet_funding_to_escrow_to_release_has_append_only_ledger(client, session) -> None:
    seller_token, buyer_token, thread_id = _setup_accepted_thread(client, session)

    fund_wallet = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.fund",
            aggregate_ref="wallet",
            mutation_scope="wallet.ledger",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-wallet-fund",
            payload={
                "wallet_actor_id": "actor-buyer-gh-kojo",
                "country_code": "GH",
                "currency": "GHS",
                "amount": 900,
                "reference_type": "deposit",
                "reference_id": "dep-cj004",
                "note": "Wallet top up",
                "reconciliation_marker": "rcn-cj004",
            },
        ),
    )
    assert fund_wallet.status_code == 200

    initiate_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.initiate",
            aggregate_ref=thread_id,
            mutation_scope="wallet.escrow",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-escrow-initiate",
            payload={"thread_id": thread_id, "note": "Open escrow"},
        ),
    )
    assert initiate_escrow.status_code == 200
    escrow_id = initiate_escrow.json()["result"]["escrow"]["escrow_id"]

    fund_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.fund",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-escrow-fund",
            payload={"escrow_id": escrow_id, "note": "Fund escrow", "partner_outcome": "funded"},
        ),
    )
    assert fund_escrow.status_code == 200

    release_escrow = _post(
        client,
        token=seller_token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="wallets.escrows.release",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="CJ-004",
            data_checks=["DI-003"],
            request_suffix="n3-escrow-release",
            payload={"escrow_id": escrow_id, "note": "Release funds"},
        ),
    )
    assert release_escrow.status_code == 200

    seller_wallet = client.get(
        "/api/v1/wallet/summary",
        headers={"Authorization": f"Bearer {seller_token}"},
    )
    escrow_read = client.get(
        f"/api/v1/wallet/escrows/{escrow_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert seller_wallet.status_code == 200
    assert escrow_read.status_code == 200
    assert seller_wallet.json()["available_balance"] == 400
    assert escrow_read.json()["state"] == "released"
    assert [item["state"] for item in escrow_read.json()["timeline"]] == [
        "initiated",
        "pending_funds",
        "funded",
        "released",
    ]

    assert session.execute(select(func.count()).select_from(EscrowRecord)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(EscrowTimelineEntry)).scalar_one() == 4
    assert session.execute(select(func.count()).select_from(WalletLedgerEntry)).scalar_one() == 4

    entries = session.execute(
        select(WalletLedgerEntry)
        .order_by(WalletLedgerEntry.wallet_actor_id.asc(), WalletLedgerEntry.entry_sequence.asc())
    ).scalars().all()
    assert [entry.entry_sequence for entry in entries if entry.wallet_actor_id == "actor-buyer-gh-kojo"] == [
        1,
        2,
        3,
    ]
    assert [entry.reason for entry in entries] == [
        "wallet_funded",
        "escrow_funded",
        "escrow_released",
        "escrow_released",
    ]
    assert session.execute(
        select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type == "escrow.transitioned")
    ).scalar_one() == 3
    assert session.execute(
        select(func.count()).select_from(OutboxMessage).where(OutboxMessage.event_type == "settlement.notification.queued")
    ).scalar_one() == 4


def test_ep004_partner_timeout_is_retry_safe_and_unauthorized_release_is_audited(client, session) -> None:
    seller_token, buyer_token, thread_id = _setup_accepted_thread(client, session)
    outsider_token = _create_session(
        session, actor_id="actor-outsider-gh-efo", role="buyer", country_code="GH"
    )

    _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.fund",
            aggregate_ref="wallet",
            mutation_scope="wallet.ledger",
            journey_id="EP-004",
            data_checks=["DI-003"],
            request_suffix="n3-timeout-wallet-fund",
            payload={
                "wallet_actor_id": "actor-buyer-gh-kojo",
                "country_code": "GH",
                "currency": "GHS",
                "amount": 900,
                "reference_type": "deposit",
                "reference_id": "dep-ep004",
                "note": "Wallet top up",
                "reconciliation_marker": "rcn-ep004",
            },
        ),
    )
    initiate_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.initiate",
            aggregate_ref=thread_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-004",
            data_checks=["DI-003"],
            request_suffix="n3-timeout-initiate",
            payload={"thread_id": thread_id, "note": "Open escrow"},
        ),
    )
    escrow_id = initiate_escrow.json()["result"]["escrow"]["escrow_id"]

    timeout_fund = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.fund",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-004",
            data_checks=["DI-003"],
            request_suffix="n3-timeout-fund",
            payload={"escrow_id": escrow_id, "note": "Partner timeout", "partner_outcome": "timeout"},
        ),
    )
    assert timeout_fund.status_code == 200
    assert timeout_fund.json()["result"]["escrow"]["state"] == "partner_pending"

    assert session.execute(select(func.count()).select_from(WalletLedgerEntry)).scalar_one() == 1

    retry_fund = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.fund",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-004",
            data_checks=["DI-003"],
            request_suffix="n3-timeout-fund-retry",
            payload={"escrow_id": escrow_id, "note": "Retry funding", "partner_outcome": "funded"},
        ),
    )
    assert retry_fund.status_code == 200
    assert retry_fund.json()["result"]["escrow"]["state"] == "funded"
    assert session.execute(select(func.count()).select_from(WalletLedgerEntry)).scalar_one() == 2

    unauthorized_release = _post(
        client,
        token=outsider_token,
        payload=_payload(
            actor_id="actor-outsider-gh-efo",
            command_name="wallets.escrows.release",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-004",
            data_checks=["DI-003"],
            request_suffix="n3-unauthorized-release",
            payload={"escrow_id": escrow_id, "note": "Bad release"},
        ),
    )
    assert unauthorized_release.status_code == 403
    assert unauthorized_release.json()["detail"]["error_code"] == "policy_denied"

    escrow_events = session.execute(
        select(EscrowTimelineEntry).where(EscrowTimelineEntry.escrow_id == escrow_id)
    ).scalars().all()
    assert [event.state for event in escrow_events] == ["initiated", "pending_funds", "partner_pending", "pending_funds", "funded"]
    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.reason_code == "unauthorized_release"
    assert session.execute(
        select(func.count())
        .select_from(OutboxMessage)
        .where(OutboxMessage.event_type == "settlement.notification.queued")
    ).scalar_one() == 4


def test_rj004_duplicate_release_is_single_effect_and_replayed(client, session) -> None:
    seller_token, buyer_token, thread_id = _setup_accepted_thread(client, session)

    fund_wallet = _payload(
        actor_id="actor-buyer-gh-kojo",
        command_name="wallets.fund",
        aggregate_ref="wallet",
        mutation_scope="wallet.ledger",
        journey_id="RJ-004",
        data_checks=["DI-003"],
        request_suffix="n3-rj004-wallet-fund",
        payload={
            "wallet_actor_id": "actor-buyer-gh-kojo",
            "country_code": "GH",
            "currency": "GHS",
            "amount": 900,
            "reference_type": "deposit",
            "reference_id": "dep-rj004",
            "note": "Wallet top up",
            "reconciliation_marker": "rcn-rj004",
        },
    )
    initiate_escrow = _payload(
        actor_id="actor-buyer-gh-kojo",
        command_name="wallets.escrows.initiate",
        aggregate_ref=thread_id,
        mutation_scope="wallet.escrow",
        journey_id="RJ-004",
        data_checks=["DI-003"],
        request_suffix="n3-rj004-escrow-initiate",
        payload={"thread_id": thread_id, "note": "Open escrow"},
    )

    assert _post(client, token=buyer_token, payload=fund_wallet).status_code == 200
    initiate_response = _post(client, token=buyer_token, payload=initiate_escrow)
    assert initiate_response.status_code == 200
    escrow_id = initiate_response.json()["result"]["escrow"]["escrow_id"]

    fund_escrow = _payload(
        actor_id="actor-buyer-gh-kojo",
        command_name="wallets.escrows.fund",
        aggregate_ref=escrow_id,
        mutation_scope="wallet.escrow",
        journey_id="RJ-004",
        data_checks=["DI-003"],
        request_suffix="n3-rj004-escrow-fund",
        payload={"escrow_id": escrow_id, "note": "Fund escrow", "partner_outcome": "funded"},
    )
    release_escrow = _payload(
        actor_id="actor-farmer-gh-ama",
        command_name="wallets.escrows.release",
        aggregate_ref=escrow_id,
        mutation_scope="wallet.escrow",
        journey_id="RJ-004",
        data_checks=["DI-003"],
        request_suffix="n3-rj004-escrow-release",
        payload={"escrow_id": escrow_id, "note": "Release funds"},
    )

    assert _post(client, token=buyer_token, payload=fund_escrow).status_code == 200

    first_release = _post(client, token=seller_token, payload=release_escrow)
    second_release = _post(client, token=seller_token, payload=release_escrow)

    assert first_release.status_code == 200
    assert second_release.status_code == 200
    assert first_release.json()["status"] == "accepted"
    assert second_release.json()["status"] == "replayed"
    assert second_release.json()["replayed"] is True
    assert second_release.json()["result"] == first_release.json()["result"]

    escrow_read = client.get(
        f"/api/v1/wallet/escrows/{escrow_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert escrow_read.status_code == 200
    assert escrow_read.json()["state"] == "released"
    assert [item["state"] for item in escrow_read.json()["timeline"]] == [
        "initiated",
        "pending_funds",
        "funded",
        "released",
    ]

    ledger_entries = session.execute(
        select(WalletLedgerEntry)
        .order_by(WalletLedgerEntry.wallet_actor_id.asc(), WalletLedgerEntry.entry_sequence.asc())
    ).scalars().all()
    assert len(ledger_entries) == 4
    assert [entry.reason for entry in ledger_entries] == [
        "wallet_funded",
        "escrow_funded",
        "escrow_released",
        "escrow_released",
    ]
    assert session.execute(select(func.count()).select_from(EscrowTimelineEntry)).scalar_one() == 4
    assert (
        session.execute(
            select(func.count())
            .select_from(AuditEvent)
            .where(
                AuditEvent.event_type == "escrow.transitioned",
                AuditEvent.reason_code == "released",
            )
        ).scalar_one()
        == 1
    )
    assert (
        session.execute(
            select(func.count())
            .select_from(OutboxMessage)
            .where(OutboxMessage.event_type == "settlement.notification.queued")
        ).scalar_one()
        == 4
    )
    assert (
        session.execute(
            select(func.count())
            .select_from(AuditEvent)
            .where(
                AuditEvent.event_type == "command.replayed",
                AuditEvent.reason_code == "idempotent_replay",
                AuditEvent.command_name == "wallets.escrows.release",
            )
        ).scalar_one()
        == 1
    )


def test_ep005_unauthorized_reversal_is_rejected_with_audit_evidence(client, session) -> None:
    seller_token, buyer_token, thread_id = _setup_accepted_thread(client, session)
    outsider_token = _create_session(
        session, actor_id="actor-outsider-gh-efo", role="buyer", country_code="GH"
    )

    assert _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.fund",
            aggregate_ref="wallet",
            mutation_scope="wallet.ledger",
            journey_id="EP-005",
            data_checks=["DI-003"],
            request_suffix="n3-ep005-wallet-fund",
            payload={
                "wallet_actor_id": "actor-buyer-gh-kojo",
                "country_code": "GH",
                "currency": "GHS",
                "amount": 900,
                "reference_type": "deposit",
                "reference_id": "dep-ep005",
                "note": "Wallet top up",
                "reconciliation_marker": "rcn-ep005",
            },
        ),
    ).status_code == 200

    initiate_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.initiate",
            aggregate_ref=thread_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-005",
            data_checks=["DI-003"],
            request_suffix="n3-ep005-escrow-initiate",
            payload={"thread_id": thread_id, "note": "Open escrow"},
        ),
    )
    assert initiate_escrow.status_code == 200
    escrow_id = initiate_escrow.json()["result"]["escrow"]["escrow_id"]

    fund_escrow = _post(
        client,
        token=buyer_token,
        payload=_payload(
            actor_id="actor-buyer-gh-kojo",
            command_name="wallets.escrows.fund",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-005",
            data_checks=["DI-003"],
            request_suffix="n3-ep005-escrow-fund",
            payload={"escrow_id": escrow_id, "note": "Fund escrow", "partner_outcome": "funded"},
        ),
    )
    assert fund_escrow.status_code == 200

    unauthorized_reversal = _post(
        client,
        token=outsider_token,
        payload=_payload(
            actor_id="actor-outsider-gh-efo",
            command_name="wallets.escrows.reverse",
            aggregate_ref=escrow_id,
            mutation_scope="wallet.escrow",
            journey_id="EP-005",
            data_checks=["DI-003"],
            request_suffix="n3-ep005-unauthorized-reversal",
            payload={
                "escrow_id": escrow_id,
                "note": "Bad reversal",
                "reversal_reason": "partner_failed",
            },
        ),
    )

    assert unauthorized_reversal.status_code == 403
    assert unauthorized_reversal.json()["detail"]["error_code"] == "policy_denied"
    assert session.execute(select(func.count()).select_from(WalletLedgerEntry)).scalar_one() == 2

    escrow_read = client.get(
        f"/api/v1/wallet/escrows/{escrow_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    assert escrow_read.status_code == 200
    assert escrow_read.json()["state"] == "funded"
    assert [item["state"] for item in escrow_read.json()["timeline"]] == [
        "initiated",
        "pending_funds",
        "funded",
    ]

    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.event_type == "command.rejected"
    assert latest_audit.status == "rejected"
    assert latest_audit.reason_code == "unauthorized_reversal"
    assert latest_audit.actor_id == "actor-outsider-gh-efo"
    assert latest_audit.command_name == "wallets.escrows.reverse"
    assert latest_audit.payload["escrow_id"] == escrow_id
    assert session.execute(
        select(func.count())
        .select_from(OutboxMessage)
        .where(OutboxMessage.event_type == "settlement.notification.queued")
    ).scalar_one() == 2
