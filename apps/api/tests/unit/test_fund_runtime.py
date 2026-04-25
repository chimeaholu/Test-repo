from __future__ import annotations

from app.db.repositories.fund import FundRepository
from app.db.repositories.ledger import LedgerRepository
from app.modules.fund.runtime import FundRuntime


def test_fund_runtime_moves_wallet_balance_into_investment_and_applies_withdrawal_penalty(session) -> None:
    fund_repository = FundRepository(session)
    ledger_repository = LedgerRepository(session)
    runtime = FundRuntime(fund_repository, ledger_repository)

    opportunity = runtime.create_opportunity(
        actor_id="actor-farmer-gh-ama",
        actor_role="farmer",
        country_code="GH",
        farm_id="farm-gh-001",
        currency="GHS",
        title="Cassava irrigation bridge",
        description="Bridge financing for irrigation upgrades ahead of the next planting cycle.",
        funding_goal=500.0,
        expected_return_pct=18.0,
        timeline_months=6,
        min_investment=100.0,
        max_investment=500.0,
    )
    ledger_repository.append_entry(
        actor_id="actor-investor-gh-akosua",
        country_code="GH",
        currency="GHS",
        direction="credit",
        reason="wallet_funded",
        amount=1000.0,
        available_delta=1000.0,
        held_delta=0.0,
        request_id="req-fund-wallet",
        idempotency_key="idem-fund-wallet",
        correlation_id="corr-fund-wallet",
        entry_metadata={"reference_type": "manual_seed", "reference_id": "seed-fund-runtime"},
    )

    creation = runtime.create_investment(
        request_id="req-fund-invest",
        idempotency_key="idem-fund-invest",
        correlation_id="corr-fund-invest",
        actor_id="actor-investor-gh-akosua",
        actor_role="investor",
        opportunity_id=opportunity.opportunity_id,
        amount=500.0,
        currency="GHS",
    )

    assert creation.opportunity.status == "funded"
    assert creation.opportunity.current_amount == 500.0
    assert creation.wallet_balance.available_balance == 500.0
    assert creation.wallet_balance.held_balance == 500.0
    assert creation.ledger_entry.reason == "fund_invested"

    withdrawal = runtime.withdraw_investment(
        request_id="req-fund-withdraw",
        idempotency_key="idem-fund-withdraw",
        correlation_id="corr-fund-withdraw",
        actor_id="actor-investor-gh-akosua",
        investment_id=creation.investment.investment_id,
    )

    assert withdrawal.investment.status == "withdrawn"
    assert withdrawal.investment.actual_return_amount == 475.0
    assert withdrawal.penalty_amount == 25.0
    assert withdrawal.opportunity.status == "open"
    assert withdrawal.opportunity.current_amount == 0.0
    assert withdrawal.wallet_balance.available_balance == 975.0
    assert withdrawal.wallet_balance.held_balance == 0.0
    assert withdrawal.ledger_entry.reason == "fund_withdrawn"
