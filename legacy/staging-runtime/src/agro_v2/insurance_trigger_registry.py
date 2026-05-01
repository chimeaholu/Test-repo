"""B-021 insurance parametric trigger registry and payout event projection."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .climate_risk_ingestion import ClimateRiskSignal
from .country_pack import resolve_country_policy
from .finance_partner_adapter import (
    FinanceDecisionOutcome,
    FinanceDecisionType,
    FinancePartnerDecisionResponse,
)


class InsuranceTriggerRegistryError(ValueError):
    """Raised when trigger definitions or evaluations are invalid."""


class TriggerOperator(str, Enum):
    LTE = "lte"
    GTE = "gte"


@dataclass(frozen=True)
class ParametricTriggerThreshold:
    metric_name: str
    operator: TriggerOperator
    threshold_value: float
    payout_factor: float
    source_reference: str

    def __post_init__(self) -> None:
        if not self.metric_name.strip():
            raise InsuranceTriggerRegistryError("metric_name is required")
        if not 0 <= self.payout_factor <= 1:
            raise InsuranceTriggerRegistryError("payout_factor must be between 0 and 1")
        if not self.source_reference.strip():
            raise InsuranceTriggerRegistryError("source_reference is required")


@dataclass(frozen=True)
class ParametricTriggerDefinition:
    trigger_id: str
    partner_id: str
    country_code: str
    product_code: str
    coverage_currency: str
    thresholds: tuple[ParametricTriggerThreshold, ...]
    evidence_reference_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.trigger_id.strip():
            raise InsuranceTriggerRegistryError("trigger_id is required")
        if not self.partner_id.strip():
            raise InsuranceTriggerRegistryError("partner_id is required")
        if not self.country_code.strip():
            raise InsuranceTriggerRegistryError("country_code is required")
        if not self.product_code.strip():
            raise InsuranceTriggerRegistryError("product_code is required")
        if not self.coverage_currency.strip():
            raise InsuranceTriggerRegistryError("coverage_currency is required")
        if not self.thresholds:
            raise InsuranceTriggerRegistryError("thresholds must not be empty")
        if not self.evidence_reference_ids:
            raise InsuranceTriggerRegistryError("evidence_reference_ids must not be empty")
        policy = resolve_country_policy(self.country_code)
        if self.coverage_currency.upper() != policy.currency:
            raise InsuranceTriggerRegistryError("coverage_currency must match country policy")


@dataclass(frozen=True)
class ParametricPayoutEvent:
    event_id: str
    trigger_id: str
    partner_reference_id: str
    farm_id: str
    country_code: str
    product_code: str
    metric_name: str
    observed_value: float
    threshold_value: float
    payout_amount_minor: int
    payout_currency: str
    source_signal_id: str
    source_reference: str
    evidence_reference_ids: tuple[str, ...]
    data_check_id: str

    def __post_init__(self) -> None:
        if not self.event_id.strip():
            raise InsuranceTriggerRegistryError("event_id is required")
        if not self.trigger_id.strip():
            raise InsuranceTriggerRegistryError("trigger_id is required")
        if not self.partner_reference_id.strip():
            raise InsuranceTriggerRegistryError("partner_reference_id is required")
        if not self.farm_id.strip():
            raise InsuranceTriggerRegistryError("farm_id is required")
        if not self.country_code.strip():
            raise InsuranceTriggerRegistryError("country_code is required")
        if not self.product_code.strip():
            raise InsuranceTriggerRegistryError("product_code is required")
        if not self.metric_name.strip():
            raise InsuranceTriggerRegistryError("metric_name is required")
        if self.payout_amount_minor <= 0:
            raise InsuranceTriggerRegistryError("payout_amount_minor must be > 0")
        if not self.payout_currency.strip():
            raise InsuranceTriggerRegistryError("payout_currency is required")
        if not self.source_signal_id.strip():
            raise InsuranceTriggerRegistryError("source_signal_id is required")
        if not self.source_reference.strip():
            raise InsuranceTriggerRegistryError("source_reference is required")
        if not self.evidence_reference_ids:
            raise InsuranceTriggerRegistryError("evidence_reference_ids must not be empty")
        if not self.data_check_id.strip():
            raise InsuranceTriggerRegistryError("data_check_id is required")


class InsuranceParametricTriggerRegistry:
    """Registers parametric thresholds and emits payout events from approved coverage."""

    def __init__(self) -> None:
        self._definitions: dict[str, ParametricTriggerDefinition] = {}
        self._emitted_keys: set[str] = set()

    def register(self, definition: ParametricTriggerDefinition) -> None:
        if definition.trigger_id in self._definitions:
            raise InsuranceTriggerRegistryError("trigger_id already registered")
        self._definitions[definition.trigger_id] = definition

    def evaluate(
        self,
        *,
        signal: ClimateRiskSignal,
        partner_decision: FinancePartnerDecisionResponse,
        coverage_amount_minor: int,
    ) -> tuple[ParametricPayoutEvent, ...]:
        if coverage_amount_minor <= 0:
            raise InsuranceTriggerRegistryError("coverage_amount_minor must be > 0")
        if partner_decision.decision_type != FinanceDecisionType.INSURANCE:
            raise InsuranceTriggerRegistryError("partner_decision must be an insurance decision")
        if partner_decision.outcome != FinanceDecisionOutcome.APPROVED:
            return ()

        payouts: list[ParametricPayoutEvent] = []
        for definition in self._definitions.values():
            if definition.partner_id != partner_decision.partner_id:
                continue
            if definition.country_code != signal.country_code:
                continue
            if definition.product_code != partner_decision.product_code:
                continue

            for threshold in definition.thresholds:
                if threshold.metric_name != signal.normalized_metric:
                    continue
                if not _threshold_matches(signal.normalized_value, threshold):
                    continue

                payout_key = (
                    f"{definition.trigger_id}:{partner_decision.partner_reference_id}:"
                    f"{signal.reconciliation_key}:{threshold.metric_name}:{threshold.threshold_value}"
                )
                if payout_key in self._emitted_keys:
                    continue
                self._emitted_keys.add(payout_key)

                payouts.append(
                    ParametricPayoutEvent(
                        event_id=f"payout:{definition.trigger_id}:{signal.signal_id}",
                        trigger_id=definition.trigger_id,
                        partner_reference_id=partner_decision.partner_reference_id,
                        farm_id=signal.farm_id,
                        country_code=signal.country_code,
                        product_code=definition.product_code,
                        metric_name=threshold.metric_name,
                        observed_value=signal.normalized_value,
                        threshold_value=threshold.threshold_value,
                        payout_amount_minor=max(
                            1, round(coverage_amount_minor * threshold.payout_factor)
                        ),
                        payout_currency=definition.coverage_currency,
                        source_signal_id=signal.signal_id,
                        source_reference=threshold.source_reference,
                        evidence_reference_ids=definition.evidence_reference_ids,
                        data_check_id="DI-006",
                    )
                )
        return tuple(payouts)


def _threshold_matches(observed_value: float, threshold: ParametricTriggerThreshold) -> bool:
    if threshold.operator == TriggerOperator.LTE:
        return observed_value <= threshold.threshold_value
    if threshold.operator == TriggerOperator.GTE:
        return observed_value >= threshold.threshold_value
    return False
