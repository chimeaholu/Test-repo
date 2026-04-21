"""F-013 climate alerts center and detail route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .climate_alert_rules import ClimateAlertDecision
from .frontend_state_primitives import FrontendStatePrimitiveLibrary, StatePrimitive


class FrontendClimateAlertError(ValueError):
    """Raised when alert list or detail surfaces lose severity or provenance cues."""


@dataclass(frozen=True)
class ClimateAlertListItem:
    alert_id: str
    alert_type: str
    severity: str
    observed_label: str
    detail_route: str


@dataclass(frozen=True)
class ClimateAlertDetailSurface:
    alert_id: str
    headline: str
    severity: str
    observed_label: str
    threshold_label: str
    provenance_key: str
    reason: str
    trust_state: StatePrimitive


@dataclass(frozen=True)
class ClimateAlertAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendClimateAlertCenter:
    """Projects climate alert decisions into center and detail views."""

    def __init__(self, *, state_library: FrontendStatePrimitiveLibrary) -> None:
        self._state_library = state_library

    def build_index(
        self,
        decisions: tuple[ClimateAlertDecision, ...],
    ) -> tuple[ClimateAlertListItem, ...]:
        ordered = sorted(decisions, key=lambda decision: decision.precedence, reverse=True)
        return tuple(
            ClimateAlertListItem(
                alert_id=decision.alert_id,
                alert_type=decision.alert_type,
                severity=decision.severity.value,
                observed_label=f"{decision.metric_name}: {decision.observed_value}",
                detail_route=f"/app/climate/alerts/{decision.alert_id}",
            )
            for decision in ordered
        )

    def build_detail(self, decision: ClimateAlertDecision) -> ClimateAlertDetailSurface:
        trust_state = self._state_library.primitive_for(
            flow=self._flow(),
            state=self._state(),
        )
        return ClimateAlertDetailSurface(
            alert_id=decision.alert_id,
            headline=decision.alert_type.replace("_", " ").title(),
            severity=decision.severity.value,
            observed_label=f"{decision.metric_name}: {decision.observed_value}",
            threshold_label=f"Threshold: {decision.threshold_value}",
            provenance_key=decision.provenance_key,
            reason=decision.reason,
            trust_state=trust_state,
        )

    def audit(
        self,
        *,
        alert_items: tuple[ClimateAlertListItem, ...],
        detail_surface: ClimateAlertDetailSurface,
    ) -> ClimateAlertAudit:
        issues: list[str] = []
        if not alert_items:
            issues.append("alert_center_empty")
        if detail_surface.provenance_key.strip() == "":
            issues.append("provenance_missing")
        if detail_surface.alert_id not in tuple(item.alert_id for item in alert_items):
            issues.append("detail_missing_from_center")
        return ClimateAlertAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C06",
            ux_data_check_id="F-013",
        )

    @staticmethod
    def _flow():
        from .interaction_feedback_library import CriticalFlow

        return CriticalFlow.ADVISORY_REQUEST

    @staticmethod
    def _state():
        from .interaction_feedback_library import InteractionState

        return InteractionState.TRUST
