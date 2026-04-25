from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models.fund import FundingOpportunity, Investment


class FundRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def _apply_search(statement, *, search: str | None):
        if not search:
            return statement
        pattern = f"%{search.strip()}%"
        return statement.where(
            or_(
                FundingOpportunity.title.ilike(pattern),
                FundingOpportunity.description.ilike(pattern),
                FundingOpportunity.farm_id.ilike(pattern),
            )
        )

    def create_opportunity(
        self,
        *,
        opportunity_id: str,
        farm_id: str,
        actor_id: str,
        country_code: str,
        currency: str,
        title: str,
        description: str,
        funding_goal: float,
        expected_return_pct: float,
        timeline_months: int,
        min_investment: float,
        max_investment: float,
    ) -> FundingOpportunity:
        opportunity = FundingOpportunity(
            opportunity_id=opportunity_id,
            farm_id=farm_id,
            actor_id=actor_id,
            country_code=country_code,
            currency=currency,
            title=title,
            description=description,
            funding_goal=funding_goal,
            current_amount=0.0,
            expected_return_pct=expected_return_pct,
            timeline_months=timeline_months,
            status="open",
            min_investment=min_investment,
            max_investment=max_investment,
        )
        self.session.add(opportunity)
        self.session.flush()
        return opportunity

    def get_opportunity(self, *, opportunity_id: str) -> FundingOpportunity | None:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.opportunity_id == opportunity_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_opportunities_by_ids(
        self, *, opportunity_ids: list[str]
    ) -> dict[str, FundingOpportunity]:
        if not opportunity_ids:
            return {}
        statement = select(FundingOpportunity).where(
            FundingOpportunity.opportunity_id.in_(opportunity_ids)
        )
        items = list(self.session.execute(statement).scalars().all())
        return {item.opportunity_id: item for item in items}

    def get_opportunity_for_actor(
        self, *, opportunity_id: str, actor_id: str, country_code: str
    ) -> FundingOpportunity | None:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.opportunity_id == opportunity_id,
            FundingOpportunity.actor_id == actor_id,
            FundingOpportunity.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_public_opportunity(
        self, *, opportunity_id: str, country_code: str
    ) -> FundingOpportunity | None:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.opportunity_id == opportunity_id,
            FundingOpportunity.country_code == country_code,
            FundingOpportunity.status.in_(("open", "funded")),
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_opportunity_for_farm(
        self, *, farm_id: str, actor_id: str, country_code: str
    ) -> FundingOpportunity | None:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.farm_id == farm_id,
            FundingOpportunity.actor_id == actor_id,
            FundingOpportunity.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_public_opportunities(
        self,
        *,
        country_code: str,
        search: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[FundingOpportunity]:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.country_code == country_code,
            FundingOpportunity.status.in_(("open", "funded")),
        )
        if status:
            statement = statement.where(FundingOpportunity.status == status)
        statement = self._apply_search(statement, search=search)
        statement = statement.order_by(
            FundingOpportunity.created_at.desc(),
            FundingOpportunity.id.desc(),
        ).limit(limit)
        return list(self.session.execute(statement).scalars().all())

    def list_opportunities_for_actor(
        self,
        *,
        actor_id: str,
        country_code: str,
        search: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[FundingOpportunity]:
        statement = select(FundingOpportunity).where(
            FundingOpportunity.actor_id == actor_id,
            FundingOpportunity.country_code == country_code,
        )
        if status:
            statement = statement.where(FundingOpportunity.status == status)
        statement = self._apply_search(statement, search=search)
        statement = statement.order_by(
            FundingOpportunity.updated_at.desc(),
            FundingOpportunity.id.desc(),
        ).limit(limit)
        return list(self.session.execute(statement).scalars().all())

    def update_opportunity_funding(
        self, *, opportunity: FundingOpportunity, amount_delta: float
    ) -> FundingOpportunity:
        next_amount = round(opportunity.current_amount + amount_delta, 2)
        if next_amount < -1e-9:
            raise ValueError("opportunity_funding_underflow")
        if next_amount - opportunity.funding_goal > 1e-9:
            raise ValueError("funding_goal_exceeded")

        opportunity.current_amount = max(0.0, next_amount)
        if opportunity.status in {"open", "funded"}:
            opportunity.status = (
                "funded"
                if opportunity.current_amount + 1e-9 >= opportunity.funding_goal
                else "open"
            )
        self.session.add(opportunity)
        self.session.flush()
        return opportunity

    def create_investment(
        self,
        *,
        investment_id: str,
        opportunity_id: str,
        investor_actor_id: str,
        country_code: str,
        amount: float,
        currency: str,
        expected_return_date: datetime,
    ) -> Investment:
        investment = Investment(
            investment_id=investment_id,
            opportunity_id=opportunity_id,
            investor_actor_id=investor_actor_id,
            country_code=country_code,
            amount=amount,
            currency=currency,
            status="active",
            expected_return_date=expected_return_date,
            actual_return_amount=None,
        )
        self.session.add(investment)
        self.session.flush()
        return investment

    def get_investment(self, *, investment_id: str) -> Investment | None:
        statement = select(Investment).where(Investment.investment_id == investment_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_investment_for_actor(
        self, *, investment_id: str, actor_id: str, country_code: str
    ) -> Investment | None:
        statement = select(Investment).where(
            Investment.investment_id == investment_id,
            Investment.investor_actor_id == actor_id,
            Investment.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_investments_for_actor(
        self,
        *,
        actor_id: str,
        country_code: str,
        status: str | None = None,
        limit: int = 100,
    ) -> list[Investment]:
        statement = select(Investment).where(
            Investment.investor_actor_id == actor_id,
            Investment.country_code == country_code,
        )
        if status:
            statement = statement.where(Investment.status == status)
        statement = statement.order_by(Investment.invested_at.desc(), Investment.id.desc()).limit(limit)
        return list(self.session.execute(statement).scalars().all())

    def settle_withdrawal(
        self,
        *,
        investment: Investment,
        actual_return_amount: float,
    ) -> Investment:
        investment.status = "withdrawn"
        investment.actual_return_amount = actual_return_amount
        self.session.add(investment)
        self.session.flush()
        return investment
