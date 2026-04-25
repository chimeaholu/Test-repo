from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import CommerceBase


class FundingOpportunity(CommerceBase):
    __tablename__ = "funding_opportunities"
    __table_args__ = (
        UniqueConstraint("opportunity_id", name="uq_funding_opportunities_opportunity_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    opportunity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    farm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    funding_goal: Mapped[float] = mapped_column(Float(), nullable=False)
    current_amount: Mapped[float] = mapped_column(Float(), nullable=False, default=0.0)
    expected_return_pct: Mapped[float] = mapped_column(Float(), nullable=False)
    timeline_months: Mapped[int] = mapped_column(Integer(), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    min_investment: Mapped[float] = mapped_column(Float(), nullable=False)
    max_investment: Mapped[float] = mapped_column(Float(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Investment(CommerceBase):
    __tablename__ = "investments"
    __table_args__ = (
        UniqueConstraint("investment_id", name="uq_investments_investment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    investment_id: Mapped[str] = mapped_column(String(64), nullable=False)
    opportunity_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("funding_opportunities.opportunity_id"), nullable=False
    )
    investor_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    amount: Mapped[float] = mapped_column(Float(), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    invested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expected_return_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_return_amount: Mapped[float | None] = mapped_column(Float(), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
