"""B-012 escrow orchestration lifecycle and exception handling scaffold."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum

from .ledger import LedgerEntry, WalletLedgerService
from .negotiation import NegotiationState, NegotiationThread
from .policy_guardrails import (
    AgentPolicyGuardrailEngine,
    PolicyDecision,
    PolicyEvaluationInput,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EscrowState(str, Enum):
    INITIATED = "initiated"
    FUNDED = "funded"
    RELEASED = "released"
    REVERSED = "reversed"
    DISPUTED = "disputed"


class EscrowFundingStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    COMPLETED = "completed"


class EscrowError(ValueError):
    """Raised when an escrow lifecycle command is invalid."""


@dataclass(frozen=True)
class EscrowEvent:
    event_id: str
    event_type: str
    actor_id: str
    occurred_at: str
    idempotency_key: str
    note: str = ""
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class EscrowRecord:
    escrow_id: str
    negotiation_thread_id: str
    buyer_wallet_id: str
    seller_wallet_id: str
    escrow_wallet_id: str
    amount_minor: int
    currency: str
    state: EscrowState
    funding_status: EscrowFundingStatus
    events: tuple[EscrowEvent, ...]
    version: int
    created_at: str
    updated_at: str


class EscrowOrchestrationService:
    """Append-only escrow lifecycle projection backed by the wallet ledger."""

    def __init__(
        self,
        *,
        ledger_service: WalletLedgerService | None = None,
        policy_engine: AgentPolicyGuardrailEngine | None = None,
        clock=None,
    ) -> None:
        self._ledger = ledger_service or WalletLedgerService()
        self._policy_engine = policy_engine or AgentPolicyGuardrailEngine()
        self._clock = clock or _utc_now_iso
        self._records: dict[str, EscrowRecord] = {}
        self._idempotency_index: dict[tuple[str, str, str], EscrowRecord] = {}

    def create_escrow(
        self,
        *,
        escrow_id: str,
        negotiation: NegotiationThread,
        buyer_wallet_id: str,
        seller_wallet_id: str,
        actor_id: str,
        idempotency_key: str,
        note: str = "",
    ) -> EscrowRecord:
        if escrow_id in self._records:
            raise EscrowError("escrow already exists")
        self._require_key(idempotency_key)
        if negotiation.state != NegotiationState.ACCEPTED:
            raise EscrowError("negotiation must be accepted before escrow creation")
        self._validate_amount(negotiation.current_amount_minor)
        self._validate_currency(negotiation.currency)

        now_iso = self._clock()
        record = EscrowRecord(
            escrow_id=escrow_id,
            negotiation_thread_id=negotiation.thread_id,
            buyer_wallet_id=buyer_wallet_id,
            seller_wallet_id=seller_wallet_id,
            escrow_wallet_id=f"escrow:{escrow_id}",
            amount_minor=negotiation.current_amount_minor,
            currency=negotiation.currency,
            state=EscrowState.INITIATED,
            funding_status=EscrowFundingStatus.NONE,
            events=(
                EscrowEvent(
                    event_id=f"{escrow_id}:01",
                    event_type="escrow_initiated",
                    actor_id=actor_id,
                    occurred_at=now_iso,
                    idempotency_key=idempotency_key,
                    note=note,
                    metadata={"negotiation_thread_id": negotiation.thread_id},
                ),
            ),
            version=1,
            created_at=now_iso,
            updated_at=now_iso,
        )
        self._records[escrow_id] = record
        self._remember(record=record, action="create", idempotency_key=idempotency_key)
        return record

    def read_escrow(self, escrow_id: str) -> EscrowRecord:
        record = self._get_record(escrow_id)
        return replace(record, events=tuple(record.events))

    def fund_escrow(
        self,
        *,
        escrow_id: str,
        actor_id: str,
        idempotency_key: str,
        payment_reference: str,
        partner_outcome: str = "success",
    ) -> EscrowRecord:
        if cached := self._replay(escrow_id=escrow_id, action="fund", idempotency_key=idempotency_key):
            return cached

        record = self._get_record(escrow_id)
        if record.state != EscrowState.INITIATED:
            raise EscrowError("escrow funding is only allowed from initiated state")
        if partner_outcome not in {"success", "timeout"}:
            raise EscrowError("partner_outcome must be success or timeout")

        if partner_outcome == "timeout":
            return self._append_event(
                record,
                event_type="funding_pending",
                actor_id=actor_id,
                idempotency_key=idempotency_key,
                note="payment partner timeout",
                state=EscrowState.INITIATED,
                funding_status=EscrowFundingStatus.PENDING,
                metadata={"payment_reference": payment_reference, "retryable": True},
                action="fund",
            )

        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:fund:debit:{record.version + 1}",
                account_id=record.buyer_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="debit",
            )
        )
        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:fund:credit:{record.version + 1}",
                account_id=record.escrow_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="credit",
            )
        )
        return self._append_event(
            record,
            event_type="escrow_funded",
            actor_id=actor_id,
            idempotency_key=idempotency_key,
            state=EscrowState.FUNDED,
            funding_status=EscrowFundingStatus.COMPLETED,
            metadata={"payment_reference": payment_reference},
            action="fund",
        )

    def release_escrow(
        self,
        *,
        escrow_id: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        idempotency_key: str,
        hitl_approved: bool = False,
        note: str = "",
    ) -> EscrowRecord:
        if cached := self._replay(
            escrow_id=escrow_id, action="release", idempotency_key=idempotency_key
        ):
            return cached

        record = self._get_record(escrow_id)
        if record.state != EscrowState.FUNDED:
            raise EscrowError("escrow release is only allowed from funded state")

        policy_outcome = self._policy_engine.evaluate(
            PolicyEvaluationInput(
                tool_name="wallet.release_escrow",
                actor_role=actor_role,
                country_code=country_code,
                risk_score=75,
                hitl_approved=hitl_approved,
            )
        )
        if policy_outcome.decision != PolicyDecision.ALLOW:
            raise EscrowError(f"release blocked by policy: {policy_outcome.reason_code}")

        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:release:debit:{record.version + 1}",
                account_id=record.escrow_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="debit",
            )
        )
        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:release:credit:{record.version + 1}",
                account_id=record.seller_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="credit",
            )
        )
        return self._append_event(
            record,
            event_type="escrow_released",
            actor_id=actor_id,
            idempotency_key=idempotency_key,
            note=note,
            state=EscrowState.RELEASED,
            funding_status=EscrowFundingStatus.COMPLETED,
            action="release",
        )

    def reverse_escrow(
        self,
        *,
        escrow_id: str,
        actor_id: str,
        idempotency_key: str,
        note: str = "",
    ) -> EscrowRecord:
        if cached := self._replay(
            escrow_id=escrow_id, action="reverse", idempotency_key=idempotency_key
        ):
            return cached

        record = self._get_record(escrow_id)
        if record.state != EscrowState.FUNDED:
            raise EscrowError("escrow reversal is only allowed from funded state")

        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:reverse:debit:{record.version + 1}",
                account_id=record.escrow_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="debit",
            )
        )
        self._ledger.append(
            LedgerEntry(
                entry_id=f"{escrow_id}:reverse:credit:{record.version + 1}",
                account_id=record.buyer_wallet_id,
                currency=record.currency,
                amount_minor=record.amount_minor,
                entry_type="credit",
            )
        )
        return self._append_event(
            record,
            event_type="escrow_reversed",
            actor_id=actor_id,
            idempotency_key=idempotency_key,
            note=note,
            state=EscrowState.REVERSED,
            funding_status=EscrowFundingStatus.COMPLETED,
            action="reverse",
        )

    def dispute_escrow(
        self,
        *,
        escrow_id: str,
        actor_id: str,
        idempotency_key: str,
        note: str = "",
    ) -> EscrowRecord:
        if cached := self._replay(
            escrow_id=escrow_id, action="dispute", idempotency_key=idempotency_key
        ):
            return cached

        record = self._get_record(escrow_id)
        if record.state != EscrowState.FUNDED:
            raise EscrowError("escrow dispute is only allowed from funded state")
        return self._append_event(
            record,
            event_type="escrow_disputed",
            actor_id=actor_id,
            idempotency_key=idempotency_key,
            note=note,
            state=EscrowState.DISPUTED,
            funding_status=EscrowFundingStatus.COMPLETED,
            action="dispute",
        )

    def _append_event(
        self,
        record: EscrowRecord,
        *,
        event_type: str,
        actor_id: str,
        idempotency_key: str,
        state: EscrowState,
        funding_status: EscrowFundingStatus,
        action: str,
        note: str = "",
        metadata: dict[str, object] | None = None,
    ) -> EscrowRecord:
        now_iso = self._clock()
        next_record = replace(
            record,
            state=state,
            funding_status=funding_status,
            events=(
                *record.events,
                EscrowEvent(
                    event_id=f"{record.escrow_id}:{len(record.events) + 1:02d}",
                    event_type=event_type,
                    actor_id=actor_id,
                    occurred_at=now_iso,
                    idempotency_key=idempotency_key,
                    note=note,
                    metadata=dict(metadata or {}),
                ),
            ),
            version=record.version + 1,
            updated_at=now_iso,
        )
        self._records[record.escrow_id] = next_record
        self._remember(record=next_record, action=action, idempotency_key=idempotency_key)
        return next_record

    def _remember(self, *, record: EscrowRecord, action: str, idempotency_key: str) -> None:
        self._idempotency_index[(record.escrow_id, action, idempotency_key)] = record

    def _replay(
        self,
        *,
        escrow_id: str,
        action: str,
        idempotency_key: str,
    ) -> EscrowRecord | None:
        self._require_key(idempotency_key)
        return self._idempotency_index.get((escrow_id, action, idempotency_key))

    def _get_record(self, escrow_id: str) -> EscrowRecord:
        if escrow_id not in self._records:
            raise KeyError(f"unknown escrow: {escrow_id}")
        return self._records[escrow_id]

    @staticmethod
    def _require_key(idempotency_key: str) -> None:
        if not idempotency_key.strip():
            raise EscrowError("idempotency_key is required")

    @staticmethod
    def _validate_amount(amount_minor: int) -> None:
        if not isinstance(amount_minor, int) or isinstance(amount_minor, bool) or amount_minor <= 0:
            raise EscrowError("amount_minor must be a positive integer")

    @staticmethod
    def _validate_currency(currency: str) -> None:
        if len(currency) != 3 or not currency.isalpha() or currency != currency.upper():
            raise EscrowError("currency must be a 3-letter uppercase code")
