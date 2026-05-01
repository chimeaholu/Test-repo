from __future__ import annotations

from contextlib import ExitStack, contextmanager
from datetime import UTC, datetime
import fcntl
from pathlib import Path
from time import sleep
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.ledger import EscrowRecord, WalletLedgerEntry
from app.db.repositories.identity import IdentityRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])

_WALLET_TRANSFER_RETRY_DELAYS_SECONDS = (0.0, 0.02, 0.05)
_WALLET_TRANSFER_LOCK_DIR = Path("/tmp/agrodomain-wallet-locks")


class WalletTransferRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_actor_id: str = Field(min_length=1, max_length=64)
    currency: str = Field(min_length=3, max_length=3)
    amount: float = Field(gt=0)
    note: str | None = Field(default=None, min_length=3, max_length=300)
    reference: str | None = Field(default=None, min_length=2, max_length=64)


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat().replace("+00:00", "Z")


def _wallet_entry_payload(entry: WalletLedgerEntry) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "entry_id": entry.entry_id,
        "wallet_id": entry.wallet_id,
        "wallet_actor_id": entry.wallet_actor_id,
        "counterparty_actor_id": entry.counterparty_actor_id,
        "country_code": entry.country_code,
        "currency": entry.currency,
        "direction": entry.direction,
        "reason": entry.reason,
        "amount": entry.amount,
        "available_delta": entry.available_delta,
        "held_delta": entry.held_delta,
        "resulting_available_balance": entry.resulting_available_balance,
        "resulting_held_balance": entry.resulting_held_balance,
        "balance_version": entry.balance_version,
        "entry_sequence": entry.entry_sequence,
        "escrow_id": entry.escrow_id,
        "request_id": entry.request_id,
        "idempotency_key": entry.idempotency_key,
        "correlation_id": entry.correlation_id,
        "reconciliation_marker": entry.reconciliation_marker,
        "created_at": _isoformat(entry.created_at),
    }


def _wallet_balance_payload(balance) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "wallet_id": balance.wallet_id,
        "wallet_actor_id": balance.wallet_actor_id,
        "country_code": balance.country_code,
        "currency": balance.currency,
        "available_balance": balance.available_balance,
        "held_balance": balance.held_balance,
        "total_balance": balance.total_balance,
        "balance_version": balance.balance_version,
        "last_entry_sequence": balance.last_entry_sequence,
        "last_reconciliation_marker": balance.last_reconciliation_marker,
        "updated_at": _isoformat(balance.updated_at),
    }


def _is_retryable_wallet_write_error(error: Exception) -> bool:
    message = str(error).lower()
    return (
        "wallet_ledger_entries.wallet_id, wallet_ledger_entries.entry_sequence" in message
        or "database is locked" in message
    )


def _wallet_lock_path(*, actor_id: str, country_code: str, currency: str) -> Path:
    safe_actor_id = "".join(
        character if character.isalnum() or character in {"-", "_"} else "_"
        for character in actor_id
    )
    return _WALLET_TRANSFER_LOCK_DIR / (
        f"{country_code.lower()}-{currency.lower()}-{safe_actor_id}.lock"
    )


@contextmanager
def _wallet_transfer_locks(*, actor_ids: list[str], country_code: str, currency: str):
    _WALLET_TRANSFER_LOCK_DIR.mkdir(parents=True, exist_ok=True)
    with ExitStack() as stack:
        handles = []
        for actor_id in sorted(set(actor_ids)):
            lock_path = _wallet_lock_path(
                actor_id=actor_id,
                country_code=country_code,
                currency=currency,
            )
            handle = stack.enter_context(lock_path.open("a+", encoding="utf-8"))
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            handles.append(handle)
        try:
            yield
        finally:
            for handle in reversed(handles):
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _escrow_payload(repository: EscrowRepository, escrow: EscrowRecord) -> dict[str, object]:
    timeline = repository.list_timeline(escrow_id=escrow.escrow_id)
    return _escrow_payload_with_timeline(escrow=escrow, timeline=timeline)


def _escrow_payload_with_timeline(
    *, escrow: EscrowRecord, timeline: list
) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "escrow_id": escrow.escrow_id,
        "thread_id": escrow.thread_id,
        "listing_id": escrow.listing_id,
        "buyer_actor_id": escrow.buyer_actor_id,
        "seller_actor_id": escrow.seller_actor_id,
        "country_code": escrow.country_code,
        "currency": escrow.currency,
        "amount": escrow.amount,
        "state": escrow.state,
        "partner_reference": escrow.partner_reference,
        "partner_reason_code": escrow.partner_reason_code,
        "funded_at": _isoformat(escrow.funded_at),
        "released_at": _isoformat(escrow.released_at),
        "reversed_at": _isoformat(escrow.reversed_at),
        "disputed_at": _isoformat(escrow.disputed_at),
        "created_at": _isoformat(escrow.created_at),
        "updated_at": _isoformat(escrow.updated_at),
        "timeline": [
            {
                "schema_version": get_envelope_schema_version(),
                "escrow_id": item.escrow_id,
                "transition": item.transition,
                "state": item.state,
                "actor_id": item.actor_id,
                "note": item.note,
                "request_id": item.request_id,
                "idempotency_key": item.idempotency_key,
                "correlation_id": item.correlation_id,
                "created_at": _isoformat(item.created_at),
                "notification": item.notification_payload,
            }
            for item in timeline
        ],
    }


@router.get("/summary")
def get_wallet_summary(
    request: Request,
    currency: str = "GHS",
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = LedgerRepository(db_session)
    balance = repository.get_wallet_balance(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        currency=currency.upper(),
    )
    return _wallet_balance_payload(balance)


@router.get("/transactions")
def list_wallet_transactions(
    request: Request,
    currency: str = "GHS",
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = LedgerRepository(db_session)
    balance = repository.get_wallet_balance(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        currency=currency.upper(),
    )
    entries = repository.list_entries(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        currency=currency.upper(),
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "wallet": _wallet_balance_payload(balance),
        "items": [_wallet_entry_payload(entry) for entry in entries],
    }


@router.get("/escrows")
def list_escrows(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = EscrowRepository(db_session)
    escrows = repository.list_escrows_for_actor(
        actor_id=auth_context.actor_subject, country_code=auth_context.country_code
    )
    timelines_by_escrow = repository.list_timelines_for_escrows(
        escrow_ids=[escrow.escrow_id for escrow in escrows]
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _escrow_payload_with_timeline(
                escrow=escrow,
                timeline=timelines_by_escrow.get(escrow.escrow_id, []),
            )
            for escrow in escrows
        ],
    }


@router.get("/escrows/{escrow_id}")
def get_escrow(
    escrow_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = EscrowRepository(db_session)
    escrow = repository.get_escrow_for_actor(
        escrow_id=escrow_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if escrow is None:
        raise HTTPException(status_code=404, detail="escrow_not_found")
    return _escrow_payload(repository, escrow)


@router.post("/transfers")
def create_wallet_transfer(
    payload: WalletTransferRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    if payload.recipient_actor_id == auth_context.actor_subject:
        raise HTTPException(status_code=400, detail="recipient_must_be_other_actor")

    identity_repository = IdentityRepository(db_session)
    recipient = identity_repository.get_session_by_actor(payload.recipient_actor_id)
    if recipient is None or recipient.country_code != auth_context.country_code:
        raise HTTPException(status_code=404, detail="recipient_not_found")

    ledger_repository = LedgerRepository(db_session)
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid4().hex[:12]}"
    correlation_id = request.headers.get("X-Correlation-ID") or request_id
    idempotency_key = request.headers.get("X-Idempotency-Key") or f"idem-{uuid4().hex[:12]}"
    currency = payload.currency.upper()
    reference = payload.reference or f"transfer-{uuid4().hex[:8]}"
    metadata = {
        "reference": reference,
        "note": payload.note,
    }

    sender_entry = None
    recipient_entry = None
    with _wallet_transfer_locks(
        actor_ids=[auth_context.actor_subject, payload.recipient_actor_id],
        country_code=auth_context.country_code,
        currency=currency,
    ):
        for attempt, delay_seconds in enumerate(_WALLET_TRANSFER_RETRY_DELAYS_SECONDS, start=1):
            try:
                sender_entry = ledger_repository.append_entry(
                    actor_id=auth_context.actor_subject,
                    country_code=auth_context.country_code,
                    currency=currency,
                    direction="debit",
                    reason="wallet_transfer_sent",
                    amount=payload.amount,
                    available_delta=-payload.amount,
                    held_delta=0.0,
                    request_id=request_id,
                    idempotency_key=idempotency_key,
                    correlation_id=correlation_id,
                    counterparty_actor_id=payload.recipient_actor_id,
                    entry_metadata=metadata,
                )
                recipient_entry = ledger_repository.append_entry(
                    actor_id=payload.recipient_actor_id,
                    country_code=auth_context.country_code,
                    currency=currency,
                    direction="credit",
                    reason="wallet_transfer_received",
                    amount=payload.amount,
                    available_delta=payload.amount,
                    held_delta=0.0,
                    request_id=request_id,
                    idempotency_key=idempotency_key,
                    correlation_id=correlation_id,
                    counterparty_actor_id=auth_context.actor_subject,
                    entry_metadata=metadata,
                )
                db_session.commit()
                break
            except ValueError as exc:
                db_session.rollback()
                if str(exc) == "insufficient_available_balance":
                    raise HTTPException(status_code=409, detail="insufficient_available_balance") from exc
                raise
            except (IntegrityError, OperationalError) as exc:
                db_session.rollback()
                if attempt >= len(_WALLET_TRANSFER_RETRY_DELAYS_SECONDS) or not _is_retryable_wallet_write_error(exc):
                    raise HTTPException(status_code=409, detail="wallet_transfer_conflict") from exc
                if delay_seconds > 0:
                    sleep(delay_seconds)

    if sender_entry is None or recipient_entry is None:
        raise HTTPException(status_code=409, detail="wallet_transfer_conflict")

    sender_balance = ledger_repository.get_wallet_balance(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        currency=currency,
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "request_id": request_id,
        "idempotency_key": idempotency_key,
        "wallet": _wallet_balance_payload(sender_balance),
        "transfer": {
            "sender_actor_id": auth_context.actor_subject,
            "recipient_actor_id": payload.recipient_actor_id,
            "amount": payload.amount,
            "currency": currency,
            "note": payload.note,
            "reference": reference,
            "sender_entry_id": sender_entry.entry_id,
            "recipient_entry_id": recipient_entry.entry_id,
            "created_at": _isoformat(datetime.now(tz=UTC)),
        },
    }
