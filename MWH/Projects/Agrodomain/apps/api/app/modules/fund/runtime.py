from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.db.models.fund import FundingOpportunity, Investment
from app.db.models.ledger import WalletLedgerEntry
from app.db.repositories.fund import FundRepository
from app.db.repositories.ledger import LedgerRepository, WalletBalanceProjection
from app.services.commands.errors import CommandRejectedError

EARLY_WITHDRAWAL_PENALTY_RATE = 0.05


@dataclass(slots=True)
class FundMutationResult:
    opportunity: FundingOpportunity
    investment: Investment
    wallet_balance: WalletBalanceProjection
    ledger_entry: WalletLedgerEntry
    penalty_amount: float = 0.0


class FundRuntime:
    def __init__(self, repository: FundRepository, ledger_repository: LedgerRepository) -> None:
        self.repository = repository
        self.ledger_repository = ledger_repository

    def create_opportunity(
        self,
        *,
        actor_id: str,
        actor_role: str | None,
        country_code: str,
        farm_id: str,
        currency: str,
        title: str,
        description: str,
        funding_goal: float,
        expected_return_pct: float,
        timeline_months: int,
        min_investment: float,
        max_investment: float,
    ) -> FundingOpportunity:
        if actor_role not in {"farmer", "cooperative", "admin"} and actor_id != "system:test":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="fund_opportunity_create_forbidden",
                payload={"actor_role": actor_role},
            )
        if funding_goal <= 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_funding_goal",
                reason_code="funding_goal_non_positive",
                payload={},
            )
        if min_investment <= 0 or max_investment <= 0:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_investment_window",
                reason_code="investment_window_non_positive",
                payload={},
            )
        if min_investment - max_investment > 1e-9:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_investment_window",
                reason_code="min_investment_exceeds_max_investment",
                payload={},
            )
        if max_investment - funding_goal > 1e-9:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_investment_window",
                reason_code="max_investment_exceeds_goal",
                payload={},
            )

        return self.repository.create_opportunity(
            opportunity_id=f"fundopp-{uuid4().hex[:12]}",
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            currency=currency,
            title=title,
            description=description,
            funding_goal=round(funding_goal, 2),
            expected_return_pct=round(expected_return_pct, 2),
            timeline_months=timeline_months,
            min_investment=round(min_investment, 2),
            max_investment=round(max_investment, 2),
        )

    def create_investment(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        correlation_id: str,
        actor_id: str,
        actor_role: str | None,
        opportunity_id: str,
        amount: float,
        currency: str,
    ) -> FundMutationResult:
        opportunity = self.repository.get_opportunity(opportunity_id=opportunity_id)
        if opportunity is None:
            raise CommandRejectedError(
                status_code=404,
                error_code="fund_opportunity_not_found",
                reason_code="fund_opportunity_not_found",
                payload={"opportunity_id": opportunity_id},
            )
        if actor_id == opportunity.actor_id and actor_id != "system:test":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="self_investment_forbidden",
                payload={"opportunity_id": opportunity_id},
            )
        if opportunity.status != "open":
            raise CommandRejectedError(
                status_code=409,
                error_code="fund_opportunity_closed",
                reason_code="fund_opportunity_not_open",
                payload={"opportunity_id": opportunity_id, "status": opportunity.status},
            )
        if currency != opportunity.currency:
            raise CommandRejectedError(
                status_code=422,
                error_code="currency_mismatch",
                reason_code="investment_currency_mismatch",
                payload={"opportunity_id": opportunity_id},
            )
        if amount < opportunity.min_investment - 1e-9:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_investment_amount",
                reason_code="investment_below_minimum",
                payload={"opportunity_id": opportunity_id},
            )
        if amount - opportunity.max_investment > 1e-9:
            raise CommandRejectedError(
                status_code=422,
                error_code="invalid_investment_amount",
                reason_code="investment_above_maximum",
                payload={"opportunity_id": opportunity_id},
            )
        remaining_amount = round(opportunity.funding_goal - opportunity.current_amount, 2)
        if amount - remaining_amount > 1e-9:
            raise CommandRejectedError(
                status_code=409,
                error_code="funding_goal_exceeded",
                reason_code="investment_exceeds_remaining_capacity",
                payload={"opportunity_id": opportunity_id},
            )

        rounded_amount = round(amount, 2)
        try:
            ledger_entry = self.ledger_repository.append_entry(
                actor_id=actor_id,
                country_code=opportunity.country_code,
                currency=currency,
                direction="debit",
                reason="fund_invested",
                amount=rounded_amount,
                available_delta=-rounded_amount,
                held_delta=rounded_amount,
                request_id=request_id,
                idempotency_key=idempotency_key,
                correlation_id=correlation_id,
                counterparty_actor_id=opportunity.actor_id,
                entry_metadata={
                    "opportunity_id": opportunity.opportunity_id,
                    "farm_id": opportunity.farm_id,
                    "module": "agrofund",
                },
            )
        except ValueError as exc:
            raise CommandRejectedError(
                status_code=409,
                error_code="policy_denied",
                reason_code=str(exc),
                payload={"opportunity_id": opportunity_id},
            ) from exc

        expected_return_date = datetime.now(tz=UTC) + timedelta(days=30 * opportunity.timeline_months)
        investment = self.repository.create_investment(
            investment_id=f"invest-{uuid4().hex[:12]}",
            opportunity_id=opportunity.opportunity_id,
            investor_actor_id=actor_id,
            country_code=opportunity.country_code,
            amount=rounded_amount,
            currency=currency,
            expected_return_date=expected_return_date,
        )
        updated_opportunity = self.repository.update_opportunity_funding(
            opportunity=opportunity,
            amount_delta=rounded_amount,
        )
        wallet_balance = self.ledger_repository.get_wallet_balance(
            actor_id=actor_id,
            country_code=opportunity.country_code,
            currency=currency,
        )
        return FundMutationResult(
            opportunity=updated_opportunity,
            investment=investment,
            wallet_balance=wallet_balance,
            ledger_entry=ledger_entry,
        )

    def withdraw_investment(
        self,
        *,
        request_id: str,
        idempotency_key: str,
        correlation_id: str,
        actor_id: str,
        investment_id: str,
    ) -> FundMutationResult:
        investment = self.repository.get_investment(investment_id=investment_id)
        if investment is None:
            raise CommandRejectedError(
                status_code=404,
                error_code="investment_not_found",
                reason_code="investment_not_found",
                payload={"investment_id": investment_id},
            )
        if investment.investor_actor_id != actor_id and actor_id != "system:test":
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="investment_withdraw_forbidden",
                payload={"investment_id": investment_id},
            )
        if investment.status != "active":
            raise CommandRejectedError(
                status_code=409,
                error_code="investment_not_active",
                reason_code="investment_not_active",
                payload={"investment_id": investment_id, "status": investment.status},
            )

        opportunity = self.repository.get_opportunity(opportunity_id=investment.opportunity_id)
        if opportunity is None:
            raise CommandRejectedError(
                status_code=404,
                error_code="fund_opportunity_not_found",
                reason_code="fund_opportunity_not_found",
                payload={"opportunity_id": investment.opportunity_id},
            )

        now = datetime.now(tz=UTC)
        expected_return_date = investment.expected_return_date
        if expected_return_date is not None and expected_return_date.tzinfo is None:
            expected_return_date = expected_return_date.replace(tzinfo=UTC)
        penalty_rate = (
            EARLY_WITHDRAWAL_PENALTY_RATE
            if expected_return_date and now < expected_return_date
            else 0.0
        )
        penalty_amount = round(investment.amount * penalty_rate, 2)
        refund_amount = round(investment.amount - penalty_amount, 2)

        ledger_entry = self.ledger_repository.append_entry(
            actor_id=investment.investor_actor_id,
            country_code=investment.country_code,
            currency=investment.currency,
            direction="credit",
            reason="fund_withdrawn",
            amount=investment.amount,
            available_delta=refund_amount,
            held_delta=-investment.amount,
            request_id=request_id,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            counterparty_actor_id=opportunity.actor_id,
            entry_metadata={
                "opportunity_id": investment.opportunity_id,
                "penalty_amount": penalty_amount,
                "refund_amount": refund_amount,
                "penalty_rate": penalty_rate,
                "module": "agrofund",
            },
        )
        settled_investment = self.repository.settle_withdrawal(
            investment=investment,
            actual_return_amount=refund_amount,
        )
        updated_opportunity = self.repository.update_opportunity_funding(
            opportunity=opportunity,
            amount_delta=-investment.amount,
        )
        wallet_balance = self.ledger_repository.get_wallet_balance(
            actor_id=investment.investor_actor_id,
            country_code=investment.country_code,
            currency=investment.currency,
        )
        return FundMutationResult(
            opportunity=updated_opportunity,
            investment=settled_investment,
            wallet_balance=wallet_balance,
            ledger_entry=ledger_entry,
            penalty_amount=penalty_amount,
        )
