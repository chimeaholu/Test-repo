from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.fund import FundingOpportunity, Investment
from app.db.repositories.fund import FundRepository

router = APIRouter(prefix="/api/v1/fund", tags=["fund"])


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat().replace("+00:00", "Z")


def _opportunity_payload(opportunity: FundingOpportunity) -> dict[str, object]:
    percent_funded = (
        round(min(100.0, (opportunity.current_amount / opportunity.funding_goal) * 100), 2)
        if opportunity.funding_goal > 0
        else 0.0
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "opportunity_id": opportunity.opportunity_id,
        "farm_id": opportunity.farm_id,
        "actor_id": opportunity.actor_id,
        "country_code": opportunity.country_code,
        "currency": opportunity.currency,
        "title": opportunity.title,
        "description": opportunity.description,
        "funding_goal": opportunity.funding_goal,
        "current_amount": opportunity.current_amount,
        "expected_return_pct": opportunity.expected_return_pct,
        "timeline_months": opportunity.timeline_months,
        "status": opportunity.status,
        "min_investment": opportunity.min_investment,
        "max_investment": opportunity.max_investment,
        "percent_funded": percent_funded,
        "remaining_amount": round(max(0.0, opportunity.funding_goal - opportunity.current_amount), 2),
        "created_at": _isoformat(opportunity.created_at),
        "updated_at": _isoformat(opportunity.updated_at),
    }


def _investment_payload(
    investment: Investment, *, opportunity: FundingOpportunity | None
) -> dict[str, object]:
    penalty_amount = (
        round(investment.amount - investment.actual_return_amount, 2)
        if investment.actual_return_amount is not None
        else 0.0
    )
    expected_return_amount = (
        round(investment.amount * (1 + (opportunity.expected_return_pct / 100)), 2)
        if opportunity is not None
        else None
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "investment_id": investment.investment_id,
        "opportunity_id": investment.opportunity_id,
        "investor_actor_id": investment.investor_actor_id,
        "country_code": investment.country_code,
        "amount": investment.amount,
        "currency": investment.currency,
        "status": investment.status,
        "invested_at": _isoformat(investment.invested_at),
        "expected_return_date": _isoformat(investment.expected_return_date),
        "actual_return_amount": investment.actual_return_amount,
        "penalty_amount": penalty_amount,
        "expected_return_amount": expected_return_amount,
        "updated_at": _isoformat(investment.updated_at),
        "opportunity": _opportunity_payload(opportunity) if opportunity is not None else None,
    }


@router.get("/opportunities")
def list_opportunities(
    request: Request,
    q: str | None = None,
    status: str | None = None,
    mine: bool = False,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = FundRepository(db_session)
    if mine:
        items = repository.list_opportunities_for_actor(
            actor_id=auth_context.actor_subject,
            country_code=auth_context.country_code,
            search=q,
            status=status,
        )
    else:
        items = repository.list_public_opportunities(
            country_code=auth_context.country_code,
            search=q,
            status=status,
        )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_opportunity_payload(item) for item in items],
    }


@router.get("/opportunities/{opportunity_id}")
def get_opportunity(
    opportunity_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = FundRepository(db_session)
    opportunity = repository.get_opportunity_for_actor(
        opportunity_id=opportunity_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if opportunity is None:
        opportunity = repository.get_public_opportunity(
            opportunity_id=opportunity_id,
            country_code=auth_context.country_code,
        )
    if opportunity is None:
        raise HTTPException(status_code=404, detail="fund_opportunity_not_found")
    return _opportunity_payload(opportunity)


@router.get("/investments")
def list_investments(
    request: Request,
    status: str | None = None,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = FundRepository(db_session)
    items = repository.list_investments_for_actor(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        status=status,
    )
    opportunities_by_id = repository.list_opportunities_by_ids(
        opportunity_ids=list({item.opportunity_id for item in items})
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _investment_payload(
                item,
                opportunity=opportunities_by_id.get(item.opportunity_id),
            )
            for item in items
        ],
    }


@router.get("/investments/{investment_id}")
def get_investment(
    investment_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    repository = FundRepository(db_session)
    investment = repository.get_investment_for_actor(
        investment_id=investment_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
    )
    if investment is None:
        raise HTTPException(status_code=404, detail="investment_not_found")
    return _investment_payload(
        investment,
        opportunity=repository.get_opportunity(opportunity_id=investment.opportunity_id),
    )
