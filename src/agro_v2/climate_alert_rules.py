"""B-018 climate alert rules engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .climate_risk_ingestion import ClimateRiskSignal
from .state_store import WorkflowCommand


class ClimateAlertRulesError(ValueError):
    """Raised when climate alert rule inputs are invalid."""


class ThresholdOperator(str, Enum):
    GREATER_THAN_OR_EQUAL = "gte"
    LESS_THAN_OR_EQUAL = "lte"


class AlertSeverity(str, Enum):
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class FarmClimateContext:
    farm_id: str
    country_code: str
    crop_type: str
    season: str
    threshold_overrides: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.farm_id.strip():
            raise ClimateAlertRulesError("farm_id is required")
        if not self.country_code.strip():
            raise ClimateAlertRulesError("country_code is required")
        if not self.crop_type.strip():
            raise ClimateAlertRulesError("crop_type is required")
        if not self.season.strip():
            raise ClimateAlertRulesError("season is required")


@dataclass(frozen=True)
class ClimateAlertRule:
    rule_id: str
    normalized_metric: str
    alert_type: str
    severity: AlertSeverity
    operator: ThresholdOperator
    threshold: float
    precedence: int
    required_risk_hints: tuple[str, ...] = ()
    season_scope: tuple[str, ...] = ()
    crop_scope: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.rule_id.strip():
            raise ClimateAlertRulesError("rule_id is required")
        if not self.normalized_metric.strip():
            raise ClimateAlertRulesError("normalized_metric is required")
        if not self.alert_type.strip():
            raise ClimateAlertRulesError("alert_type is required")
        if self.precedence <= 0:
            raise ClimateAlertRulesError("precedence must be greater than zero")


@dataclass(frozen=True)
class ClimateAlertDecision:
    alert_id: str
    farm_id: str
    country_code: str
    alert_type: str
    severity: AlertSeverity
    precedence: int
    metric_name: str
    observed_value: float
    threshold_value: float
    source_signal_id: str
    provenance_key: str
    reason: str

    def to_workflow_command(
        self,
        *,
        workflow_id: str,
        idempotency_key: str,
        channel: str = "system",
    ) -> WorkflowCommand:
        return WorkflowCommand(
            workflow_id=workflow_id,
            channel=channel,
            idempotency_key=idempotency_key,
            event_type="climate.alert.upserted",
            state_delta={
                "climate_alert": {
                    "alert_id": self.alert_id,
                    "alert_type": self.alert_type,
                    "severity": self.severity.value,
                    "precedence": self.precedence,
                    "metric_name": self.metric_name,
                    "observed_value": self.observed_value,
                    "threshold_value": self.threshold_value,
                    "source_signal_id": self.source_signal_id,
                    "provenance_key": self.provenance_key,
                    "reason": self.reason,
                }
            },
            metadata={
                "journey": "CJ-006",
                "data_check": "DI-006",
                "country_code": self.country_code,
            },
        )


class ClimateAlertRulesEngine:
    """Evaluates normalized climate signals against farm-context alert thresholds."""

    def __init__(self, rules: tuple[ClimateAlertRule, ...] | None = None) -> None:
        self._rules = rules or default_climate_alert_rules()
        if not self._rules:
            raise ClimateAlertRulesError("rules must not be empty")

    def evaluate(
        self,
        *,
        signals: tuple[ClimateRiskSignal, ...],
        context: FarmClimateContext,
    ) -> tuple[ClimateAlertDecision, ...]:
        if not signals:
            raise ClimateAlertRulesError("signals must not be empty")

        decisions: list[ClimateAlertDecision] = []
        for signal in signals:
            if signal.farm_id != context.farm_id:
                raise ClimateAlertRulesError("signal farm_id does not match context")
            for rule in self._matching_rules(signal=signal, context=context):
                threshold = context.threshold_overrides.get(
                    rule.normalized_metric,
                    rule.threshold,
                )
                if _threshold_matches(
                    operator=rule.operator,
                    observed=signal.normalized_value,
                    threshold=threshold,
                ):
                    decisions.append(
                        ClimateAlertDecision(
                            alert_id=f"alert:{signal.farm_id}:{rule.rule_id}:{signal.observed_at}",
                            farm_id=signal.farm_id,
                            country_code=signal.country_code,
                            alert_type=rule.alert_type,
                            severity=rule.severity,
                            precedence=rule.precedence,
                            metric_name=signal.normalized_metric,
                            observed_value=signal.normalized_value,
                            threshold_value=threshold,
                            source_signal_id=signal.signal_id,
                            provenance_key=signal.provenance_key,
                            reason=f"{rule.rule_id}:{signal.risk_hint}",
                        )
                    )

        resolved = _dedupe_by_alert_type(decisions)
        return tuple(sorted(resolved, key=_decision_sort_key))

    def _matching_rules(
        self,
        *,
        signal: ClimateRiskSignal,
        context: FarmClimateContext,
    ) -> tuple[ClimateAlertRule, ...]:
        matches = []
        for rule in self._rules:
            if rule.normalized_metric != signal.normalized_metric:
                continue
            if rule.required_risk_hints and signal.risk_hint not in rule.required_risk_hints:
                continue
            if rule.season_scope and context.season not in rule.season_scope:
                continue
            if rule.crop_scope and context.crop_type not in rule.crop_scope:
                continue
            matches.append(rule)
        return tuple(matches)


def default_climate_alert_rules() -> tuple[ClimateAlertRule, ...]:
    return (
        ClimateAlertRule(
            rule_id="rainfall_flood_watch",
            normalized_metric="rainfall_24h_mm",
            alert_type="flood_watch",
            severity=AlertSeverity.WARNING,
            operator=ThresholdOperator.GREATER_THAN_OR_EQUAL,
            threshold=70.0,
            precedence=60,
            required_risk_hints=("heavy_rain",),
        ),
        ClimateAlertRule(
            rule_id="maize_flowering_flood_critical",
            normalized_metric="rainfall_24h_mm",
            alert_type="flood_watch",
            severity=AlertSeverity.CRITICAL,
            operator=ThresholdOperator.GREATER_THAN_OR_EQUAL,
            threshold=90.0,
            precedence=100,
            required_risk_hints=("heavy_rain",),
            season_scope=("flowering",),
            crop_scope=("maize",),
        ),
        ClimateAlertRule(
            rule_id="heat_watch",
            normalized_metric="temperature_max_c",
            alert_type="heat_stress",
            severity=AlertSeverity.WATCH,
            operator=ThresholdOperator.GREATER_THAN_OR_EQUAL,
            threshold=35.0,
            precedence=40,
            required_risk_hints=("heat_watch",),
        ),
        ClimateAlertRule(
            rule_id="vegetation_stress_warning",
            normalized_metric="ndvi_ratio",
            alert_type="vegetation_stress",
            severity=AlertSeverity.WARNING,
            operator=ThresholdOperator.LESS_THAN_OR_EQUAL,
            threshold=0.3,
            precedence=80,
            required_risk_hints=("vegetation_stress",),
        ),
        ClimateAlertRule(
            rule_id="soil_moisture_dryness_warning",
            normalized_metric="soil_moisture_ratio",
            alert_type="dryness_watch",
            severity=AlertSeverity.WARNING,
            operator=ThresholdOperator.LESS_THAN_OR_EQUAL,
            threshold=0.2,
            precedence=70,
            required_risk_hints=("dryness_watch",),
        ),
    )


def _threshold_matches(
    *,
    operator: ThresholdOperator,
    observed: float,
    threshold: float,
) -> bool:
    if operator == ThresholdOperator.GREATER_THAN_OR_EQUAL:
        return observed >= threshold
    return observed <= threshold


def _dedupe_by_alert_type(
    decisions: list[ClimateAlertDecision],
) -> list[ClimateAlertDecision]:
    best: dict[str, ClimateAlertDecision] = {}
    for decision in decisions:
        existing = best.get(decision.alert_type)
        if existing is None or _decision_sort_key(decision) < _decision_sort_key(existing):
            best[decision.alert_type] = decision
    return list(best.values())


def _decision_sort_key(decision: ClimateAlertDecision) -> tuple[int, int, str]:
    severity_rank = {
        AlertSeverity.CRITICAL: 0,
        AlertSeverity.WARNING: 1,
        AlertSeverity.WATCH: 2,
    }
    return (-decision.precedence, -int(1000 * (1 - severity_rank[decision.severity])), decision.alert_id)
