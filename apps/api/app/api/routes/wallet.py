from __future__ import annotations

from contextlib import ExitStack, contextmanager
from datetime import UTC, datetime
import fcntl
from pathlib import Path
from time import sleep
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.core.demo import same_demo_boundary
from app.db.models.ledger import EscrowRecord, WalletLedgerEntry
from app.db.models.payments import PaymentCollectionRecord
from app.db.repositories.audit import AuditRepository
from app.db.repositories.identity import IdentityRepository
from app.db.repositories.ledger import EscrowRepository, LedgerRepository
from app.db.repositories.payments import PaymentRepository
from app.modules.finance.payments import (
    PaymentCollectionSession,
    PaymentProvider,
    PaymentProviderError,
    build_payment_provider,
    minor_units_for_amount,
)
from app.services.commands.bus import CommandBus
from app.services.commands.contracts import CommandEnvelope
from app.services.outbox import OutboxService

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


class PaymentCollectionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    escrow_id: str = Field(min_length=1, max_length=64)
    callback_url: str | None = Field(default=None, max_length=500)
    channels: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    force_new: bool = False


class PaymentCollectionSyncRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str | None = Field(default=None, min_length=3, max_length=300)


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


def _payment_provider_for_request(request: Request, settings: Settings) -> PaymentProvider:
    provider = getattr(request.app.state, "payment_provider", None)
    if provider is not None:
        return provider
    return build_payment_provider(settings)


def _payment_payload(record: PaymentCollectionRecord) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "payment_id": record.payment_id,
        "escrow_id": record.escrow_id,
        "actor_id": record.actor_id,
        "country_code": record.country_code,
        "currency": record.currency,
        "amount": record.amount,
        "provider": record.provider,
        "provider_mode": record.provider_mode,
        "provider_reference": record.provider_reference,
        "provider_access_code": record.provider_access_code,
        "authorization_url": record.authorization_url,
        "local_status": record.local_status,
        "provider_status": record.provider_status,
        "provider_transaction_id": record.provider_transaction_id,
        "channels": record.channels,
        "last_error_code": record.last_error_code,
        "last_error_detail": record.last_error_detail,
        "verified_at": _isoformat(record.verified_at),
        "wallet_entry_id": record.wallet_entry_id,
        "wallet_funding_applied_at": _isoformat(record.wallet_funding_applied_at),
        "escrow_funded_at": _isoformat(record.escrow_funded_at),
        "metadata": record.metadata_json,
        "provider_payload": record.provider_payload,
        "created_at": _isoformat(record.created_at),
        "updated_at": _isoformat(record.updated_at),
    }


def _payment_channels_for_country(*, country_code: str) -> list[str]:
    if country_code == "GH":
        return ["mobile_money", "bank_transfer", "card"]
    return ["bank_transfer", "ussd", "card"]


def _payment_local_status(session: PaymentCollectionSession) -> str:
    if session.provider_status == "success":
        return "verified"
    if session.provider_status in {"failed", "abandoned"}:
        return session.provider_status
    return "pending"


def _build_internal_command(
    *,
    auth_context,
    request: Request,
    command_name: str,
    aggregate_ref: str,
    mutation_scope: str,
    payload: dict[str, object],
) -> CommandEnvelope:
    request_suffix = uuid4().hex[:12]
    return CommandEnvelope.model_validate(
        {
            "metadata": {
                "request_id": f"{request.state.request_id}-{request_suffix}",
                "idempotency_key": f"{command_name}-{aggregate_ref}-{request_suffix}",
                "actor_id": auth_context.actor_subject,
                "country_code": auth_context.country_code,
                "channel": "api",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": request.state.correlation_id,
                "occurred_at": datetime.now(tz=UTC).isoformat(),
                "traceability": {"journey_ids": ["EH5-G1"], "data_check_ids": ["DI-EH5-01"]},
            },
            "command": {
                "name": command_name,
                "aggregate_ref": aggregate_ref,
                "mutation_scope": mutation_scope,
                "payload": payload,
            },
        }
    )


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
    if not same_demo_boundary(auth_context.actor_subject, payload.recipient_actor_id):
        raise HTTPException(status_code=403, detail="demo_boundary_violation")

    identity_repository = IdentityRepository(db_session)
    recipient = identity_repository.get_account_by_actor(payload.recipient_actor_id)
    recipient_memberships = identity_repository.list_memberships(
        actor_id=payload.recipient_actor_id,
        country_code=auth_context.country_code,
    )
    if recipient is None or not recipient_memberships:
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


@router.get("/payments/collections")
def list_payment_collections(
    request: Request,
    escrow_id: str | None = None,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")

    repository = PaymentRepository(db_session)
    items = repository.list_collections_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        escrow_id=escrow_id,
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_payment_payload(item) for item in items],
    }


@router.get("/payments/collections/{payment_id}")
def get_payment_collection(
    payment_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")

    repository = PaymentRepository(db_session)
    record = repository.get_collection_for_actor(
        payment_id=payment_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="payment_collection_not_found")
    return _payment_payload(record)


@router.post("/payments/collections")
def initialize_payment_collection(
    payload: PaymentCollectionCreateRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")

    payment_repository = PaymentRepository(db_session)
    escrow_repository = EscrowRepository(db_session)
    identity_repository = IdentityRepository(db_session)
    audit_repository = AuditRepository(db_session)
    outbox = OutboxService(db_session)

    escrow = escrow_repository.get_escrow_for_actor(
        escrow_id=payload.escrow_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if escrow is None:
        raise HTTPException(status_code=404, detail="escrow_not_found")
    if auth_context.actor_subject != escrow.buyer_actor_id:
        raise HTTPException(status_code=403, detail="escrow_collection_forbidden")
    if escrow.state in {"released", "reversed"}:
        raise HTTPException(status_code=409, detail="escrow_terminal_state")

    if not payload.force_new:
        existing = payment_repository.latest_active_collection_for_escrow(
            escrow_id=escrow.escrow_id,
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
        )
        if existing is not None:
            return {
                "schema_version": get_envelope_schema_version(),
                "reused": True,
                "payment": _payment_payload(existing),
            }

    account = identity_repository.get_account_by_actor(auth_context.actor_subject)
    if account is None:
        raise HTTPException(status_code=404, detail="identity_account_not_found")

    provider = _payment_provider_for_request(request, settings)
    provider_reference = f"agro-{escrow.escrow_id}-{uuid4().hex[:8]}"
    channels = payload.channels or _payment_channels_for_country(country_code=auth_context.country_code)
    metadata = {
        "escrow_id": escrow.escrow_id,
        "listing_id": escrow.listing_id,
        "buyer_actor_id": escrow.buyer_actor_id,
        "seller_actor_id": escrow.seller_actor_id,
        **payload.metadata,
    }

    try:
        session = provider.initialize_collection(
            amount_minor=minor_units_for_amount(amount=escrow.amount),
            currency=escrow.currency,
            email=account.email,
            reference=provider_reference,
            callback_url=payload.callback_url or settings.paystack_callback_url,
            channels=channels,
            metadata=metadata,
        )
    except PaymentProviderError as exc:
        raise HTTPException(
            status_code=503 if exc.code in {"provider_not_configured", "provider_live_gate_closed"} else 502,
            detail={"error_code": exc.code, "message": exc.detail},
        ) from exc

    record = payment_repository.create_collection(
        payment_id=f"paycol-{uuid4().hex[:12]}",
        escrow_id=escrow.escrow_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        currency=escrow.currency,
        amount=escrow.amount,
        provider=session.provider,
        provider_mode=session.provider_mode,
        provider_reference=session.provider_reference,
        provider_access_code=session.access_code,
        authorization_url=session.authorization_url,
        local_status=_payment_local_status(session),
        provider_status=session.provider_status,
        provider_transaction_id=session.provider_transaction_id,
        channels=session.channels,
        provider_payload=session.raw_payload,
        metadata_json=metadata,
        last_error_code=session.last_error_code,
        last_error_detail=session.last_error_detail,
    )
    escrow.partner_reference = session.provider_reference
    db_session.flush()

    if escrow.state == "initiated":
        envelope = _build_internal_command(
            auth_context=auth_context,
            request=request,
            command_name="wallets.escrows.mark_partner_pending",
            aggregate_ref=escrow.escrow_id,
            mutation_scope="wallet.escrow",
            payload={
                "escrow_id": escrow.escrow_id,
                "pending_reason_code": f"{session.provider}_collection_initialized",
                "note": "External payment collection initialized.",
            },
        )
        bus = CommandBus(
            session=db_session,
            telemetry=request.app.state.telemetry,
            correlation_id=request.state.correlation_id,
            settings=settings,
        )
        bus.dispatch(envelope, auth_context)

    outbox.enqueue(
        aggregate_type="payment_collection",
        aggregate_id=record.payment_id,
        event_type="payment.collection.initialized",
        payload={
            "payment_id": record.payment_id,
            "escrow_id": record.escrow_id,
            "provider": record.provider,
            "provider_reference": record.provider_reference,
            "provider_status": record.provider_status,
        },
    )
    audit_repository.record_event(
        request_id=request.state.request_id,
        actor_id=auth_context.actor_subject,
        event_type="payment.collection.initialized",
        command_name="wallet.payments.collections.initialize",
        status=record.local_status,
        reason_code=record.provider_status,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=_payment_payload(record),
        correlation_id=request.state.correlation_id,
    )
    db_session.commit()
    return {
        "schema_version": get_envelope_schema_version(),
        "reused": False,
        "payment": _payment_payload(record),
    }


@router.post("/payments/collections/{payment_id}/sync")
def sync_payment_collection(
    payment_id: str,
    payload: PaymentCollectionSyncRequest | None,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")

    payment_repository = PaymentRepository(db_session)
    escrow_repository = EscrowRepository(db_session)
    ledger_repository = LedgerRepository(db_session)
    audit_repository = AuditRepository(db_session)
    outbox = OutboxService(db_session)

    record = payment_repository.get_collection_for_actor(
        payment_id=payment_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="payment_collection_not_found")

    provider = _payment_provider_for_request(request, settings)
    try:
        session = provider.verify_collection(provider_reference=record.provider_reference)
    except PaymentProviderError as exc:
        raise HTTPException(status_code=502, detail={"error_code": exc.code, "message": exc.detail}) from exc

    payment_repository.update_collection_status(
        record=record,
        local_status=_payment_local_status(session),
        provider_status=session.provider_status,
        provider_transaction_id=session.provider_transaction_id,
        provider_payload=session.raw_payload,
        last_error_code=session.last_error_code,
        last_error_detail=session.last_error_detail,
        verified_at=datetime.now(tz=UTC),
    )

    escrow = escrow_repository.get_escrow_for_actor(
        escrow_id=record.escrow_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if escrow is None:
        raise HTTPException(status_code=404, detail="escrow_not_found")

    if session.provider_status == "success":
        if record.wallet_funding_applied_at is None:
            wallet_entry = ledger_repository.append_entry(
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code,
                currency=record.currency,
                direction="credit",
                reason="external_collection_settled",
                amount=record.amount,
                available_delta=record.amount,
                held_delta=0.0,
                request_id=f"{request.state.request_id}-pay-credit",
                idempotency_key=f"{record.payment_id}-wallet-credit",
                correlation_id=request.state.correlation_id,
                counterparty_actor_id=f"provider:{record.provider}",
                entry_metadata={
                    "provider": record.provider,
                    "provider_reference": record.provider_reference,
                    "payment_id": record.payment_id,
                },
            )
            payment_repository.mark_wallet_funded(
                record=record,
                wallet_entry_id=wallet_entry.entry_id,
                applied_at=datetime.now(tz=UTC),
            )

        if record.escrow_funded_at is None and escrow.state != "funded":
            escrow.partner_reference = record.provider_reference
            db_session.flush()
            envelope = _build_internal_command(
                auth_context=auth_context,
                request=request,
                command_name="wallets.escrows.fund",
                aggregate_ref=escrow.escrow_id,
                mutation_scope="wallet.escrow",
                payload={
                    "escrow_id": escrow.escrow_id,
                    "note": (payload.note if payload else None) or "Funding confirmed from Paystack collection.",
                    "partner_outcome": "funded",
                },
            )
            bus = CommandBus(
                session=db_session,
                telemetry=request.app.state.telemetry,
                correlation_id=request.state.correlation_id,
                settings=settings,
            )
            bus.dispatch(envelope, auth_context)
            payment_repository.mark_escrow_funded(record=record, funded_at=datetime.now(tz=UTC))
    elif session.provider_status in {"failed", "abandoned"}:
        escrow.partner_reason_code = session.provider_status
        db_session.flush()

    outbox.enqueue(
        aggregate_type="payment_collection",
        aggregate_id=record.payment_id,
        event_type="payment.collection.synced",
        payload={
            "payment_id": record.payment_id,
            "provider_status": record.provider_status,
            "local_status": record.local_status,
            "escrow_id": record.escrow_id,
        },
    )
    audit_repository.record_event(
        request_id=request.state.request_id,
        actor_id=auth_context.actor_subject,
        event_type="payment.collection.synced",
        command_name="wallet.payments.collections.sync",
        status=record.local_status,
        reason_code=record.provider_status,
        schema_version=get_envelope_schema_version(),
        idempotency_key=None,
        payload=_payment_payload(record),
        correlation_id=request.state.correlation_id,
    )
    db_session.commit()
    refreshed_record = payment_repository.get_collection(payment_id=record.payment_id)
    assert refreshed_record is not None
    refreshed_escrow = escrow_repository.get_escrow(escrow_id=record.escrow_id)
    return {
        "schema_version": get_envelope_schema_version(),
        "payment": _payment_payload(refreshed_record),
        "escrow": _escrow_payload(escrow_repository, refreshed_escrow) if refreshed_escrow is not None else None,
    }
