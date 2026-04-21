from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.marketplace import MarketplaceRepository

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


class InitiateEscrowRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    thread_id: str = Field(min_length=1, max_length=64)
    note: str | None = Field(default=None, max_length=240)


class MarkPartnerPendingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str | None = Field(default=None, max_length=240)
    pending_reason_code: str = Field(min_length=3, max_length=64)


def _authenticate(request: Request, settings: Settings, session: Session) -> AuthContext:
    auth_context = authenticate_request(request, settings, session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return auth_context


def _currency_for_country(country_code: str) -> str:
    return {
        "GH": "GHS",
        "NG": "NGN",
        "JM": "JMD",
    }.get(country_code, "USD")


def _serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _wallet_projection(
    *,
    auth_context: AuthContext,
    ledger_repository: LedgerRepository,
) -> dict[str, Any]:
    country_code = auth_context.country_code or "GH"
    currency = _currency_for_country(country_code)
    balance = ledger_repository.get_wallet_balance(
        actor_id=auth_context.actor_subject,
        country_code=country_code,
        currency=currency,
    )
    entries = ledger_repository.list_entries(
        actor_id=auth_context.actor_subject,
        country_code=country_code,
        currency=currency,
        limit=20,
    )
    return {
        "currency": currency,
        "balance": {
            "wallet_id": balance.wallet_id,
            "available_balance": balance.available_balance,
            "held_balance": balance.held_balance,
            "total_balance": balance.total_balance,
            "balance_version": balance.balance_version,
            "last_entry_sequence": balance.last_entry_sequence,
            "updated_at": _serialize_datetime(balance.updated_at),
        },
        "entries": [
            {
                "entry_id": entry.entry_id,
                "direction": entry.direction,
                "reason": entry.reason,
                "amount": entry.amount,
                "available_delta": entry.available_delta,
                "held_delta": entry.held_delta,
                "escrow_id": entry.escrow_id,
                "created_at": _serialize_datetime(entry.created_at),
            }
            for entry in entries
        ],
    }


def _timeline_projection(escrow_repository: EscrowRepository, escrow_id: str) -> list[dict[str, Any]]:
    return [
        {
            "escrow_id": item.escrow_id,
            "actor_id": item.actor_id,
            "transition": item.transition,
            "state": item.state,
            "note": item.note,
            "request_id": item.request_id,
            "notification": item.notification_payload,
            "created_at": _serialize_datetime(item.created_at),
        }
        for item in escrow_repository.list_timeline(escrow_id=escrow_id)
    ]


def _escrow_projection(
    escrow_repository: EscrowRepository,
    marketplace_repository: MarketplaceRepository,
    actor_id: str,
    country_code: str,
) -> dict[str, Any]:
    escrows = escrow_repository.list_escrows_for_actor(actor_id=actor_id, country_code=country_code)
    accepted_threads = [
        thread
        for thread in marketplace_repository.list_negotiation_threads(
            actor_id=actor_id,
            country_code=country_code,
        )
        if thread.status == "accepted"
    ]
    candidates = []
    for thread in accepted_threads:
        if escrow_repository.get_escrow_by_thread(thread_id=thread.thread_id) is not None:
            continue
        candidates.append(
            {
                "thread_id": thread.thread_id,
                "listing_id": thread.listing_id,
                "current_offer_amount": thread.current_offer_amount,
                "current_offer_currency": thread.current_offer_currency,
                "counterparty_actor_id": (
                    thread.seller_actor_id if thread.buyer_actor_id == actor_id else thread.buyer_actor_id
                ),
                "last_action_at": _serialize_datetime(thread.last_action_at),
            }
        )
    return {
        "escrows": [
            {
                "escrow_id": escrow.escrow_id,
                "thread_id": escrow.thread_id,
                "listing_id": escrow.listing_id,
                "buyer_actor_id": escrow.buyer_actor_id,
                "seller_actor_id": escrow.seller_actor_id,
                "currency": escrow.currency,
                "amount": escrow.amount,
                "state": escrow.state,
                "partner_reason_code": escrow.partner_reason_code,
                "created_at": _serialize_datetime(escrow.created_at),
                "updated_at": _serialize_datetime(escrow.updated_at),
                "funded_at": _serialize_datetime(escrow.funded_at),
                "released_at": _serialize_datetime(escrow.released_at),
                "reversed_at": _serialize_datetime(escrow.reversed_at),
                "disputed_at": _serialize_datetime(escrow.disputed_at),
                "timeline": _timeline_projection(escrow_repository, escrow.escrow_id),
            }
            for escrow in escrows
        ],
        "candidates": candidates,
    }


@router.get("/workspace")
def wallet_workspace(
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _authenticate(request, settings, session)
    country_code = auth_context.country_code or "GH"
    ledger_repository = LedgerRepository(session)
    escrow_repository = EscrowRepository(session)
    marketplace_repository = MarketplaceRepository(session)
    wallet = _wallet_projection(auth_context=auth_context, ledger_repository=ledger_repository)
    escrow = _escrow_projection(
        escrow_repository,
        marketplace_repository,
        auth_context.actor_subject,
        country_code,
    )
    return {
        "generated_at": _serialize_datetime(datetime.now(tz=UTC)),
        "actor_id": auth_context.actor_subject,
        "country_code": country_code,
        "wallet": wallet,
        "escrow": escrow,
    }


@router.post("/escrows/initiate")
def initiate_escrow(
    payload: InitiateEscrowRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _authenticate(request, settings, session)
    marketplace_repository = MarketplaceRepository(session)
    escrow_repository = EscrowRepository(session)
    thread = marketplace_repository.get_negotiation_thread_for_actor(
        thread_id=payload.thread_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if thread is None:
        raise HTTPException(status_code=404, detail="thread_not_found")
    if thread.status != "accepted":
        raise HTTPException(status_code=409, detail="thread_not_accepted")
    escrow = escrow_repository.get_escrow_by_thread(thread_id=thread.thread_id)
    if escrow is None:
        escrow = escrow_repository.create_escrow(
            escrow_id=f"escrow-{thread.thread_id.removeprefix('thread-')}",
            thread_id=thread.thread_id,
            listing_id=thread.listing_id,
            buyer_actor_id=thread.buyer_actor_id,
            seller_actor_id=thread.seller_actor_id,
            country_code=thread.country_code,
            currency=thread.current_offer_currency,
            amount=thread.current_offer_amount,
            initiated_by_actor_id=auth_context.actor_subject,
        )
        escrow_repository.append_timeline_entry(
            escrow_id=escrow.escrow_id,
            actor_id=auth_context.actor_subject,
            transition="initiated",
            state="initiated",
            note=payload.note,
            request_id=getattr(request.state, "request_id", f"wallet-initiate-{thread.thread_id}"),
            idempotency_key=f"wallet-initiate-{thread.thread_id}",
            correlation_id=getattr(request.state, "request_id", f"wallet-initiate-{thread.thread_id}"),
        )
        session.commit()
    return {
        "escrow_id": escrow.escrow_id,
        "state": escrow.state,
        "thread_id": escrow.thread_id,
    }


@router.post("/escrows/{escrow_id}/partner-pending")
def mark_partner_pending(
    escrow_id: str,
    payload: MarkPartnerPendingRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, Any]:
    auth_context = _authenticate(request, settings, session)
    escrow_repository = EscrowRepository(session)
    escrow = escrow_repository.get_escrow_for_actor(
        escrow_id=escrow_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if escrow is None:
        raise HTTPException(status_code=404, detail="escrow_not_found")
    if escrow.state in {"released", "reversed"}:
        raise HTTPException(status_code=409, detail="escrow_terminal_state")
    escrow = escrow_repository.transition_escrow(
        escrow=escrow,
        state="partner_pending",
        partner_reason_code=payload.pending_reason_code,
    )
    notification: dict[str, object] = {
        "notification_id": f"notification-{escrow.escrow_id}",
        "recipient_actor_id": auth_context.actor_subject,
        "message_key": "escrow.partner_pending",
        "delivery_state": "fallback_sent",
        "fallback_channel": "sms",
        "fallback_reason": "delivery_failed",
        "state": escrow.state,
        "escrow_id": escrow.escrow_id,
    }
    escrow_repository.append_timeline_entry(
        escrow_id=escrow.escrow_id,
        actor_id=auth_context.actor_subject,
        transition="partner_pending",
        state="partner_pending",
        note=payload.note,
        request_id=getattr(request.state, "request_id", f"wallet-partner-pending-{escrow.escrow_id}"),
        idempotency_key=f"wallet-partner-pending-{escrow.escrow_id}",
        correlation_id=getattr(request.state, "request_id", f"wallet-partner-pending-{escrow.escrow_id}"),
        notification_payload=notification,
    )
    session.commit()
    return {
        "escrow_id": escrow.escrow_id,
        "state": escrow.state,
        "partner_reason_code": escrow.partner_reason_code,
        "notification": notification,
    }
