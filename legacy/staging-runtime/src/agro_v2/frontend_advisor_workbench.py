"""F-020 advisor queue and intervention workbench contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .frontend_advisory_routes import AdvisoryAnswerSurface
from .frontend_climate_alert_center import ClimateAlertDetailSurface


class FrontendAdvisorWorkbenchError(ValueError):
    """Raised when advisor workbench views lose triage or follow-up coverage."""


@dataclass(frozen=True)
class AdvisorQueueItem:
    case_id: str
    headline: str
    urgency_label: str
    detail_route: str


@dataclass(frozen=True)
class AdvisorInterventionLogRow:
    case_id: str
    occurred_at: str
    summary: str


@dataclass(frozen=True)
class AdvisorWorkbenchSurface:
    queue_route: str
    queue_items: tuple[AdvisorQueueItem, ...]
    intervention_route: str
    intervention_log: tuple[AdvisorInterventionLogRow, ...]


@dataclass(frozen=True)
class AdvisorWorkbenchAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendAdvisorWorkbench:
    """Composes advisory answer and climate context into an intervention workbench."""

    def build_surface(
        self,
        *,
        answer_surface: AdvisoryAnswerSurface,
        alert_detail: ClimateAlertDetailSurface,
        intervention_log: tuple[AdvisorInterventionLogRow, ...] = (),
    ) -> AdvisorWorkbenchSurface:
        advisory_case_id = answer_surface.answer_route.rstrip("/").split("/")[-1] or "latest"
        advisory_headline = answer_surface.body.split(".", 1)[0].strip() or "Advisory follow-up"
        queue_items = (
            AdvisorQueueItem(
                case_id=advisory_case_id,
                headline=advisory_headline,
                urgency_label="Advisory follow-up",
                detail_route=f"/app/advisor/interventions/{advisory_case_id}",
            ),
            AdvisorQueueItem(
                case_id=alert_detail.alert_id,
                headline=alert_detail.headline,
                urgency_label=alert_detail.severity,
                detail_route=f"/app/advisor/interventions/{alert_detail.alert_id}",
            ),
        )
        return AdvisorWorkbenchSurface(
            queue_route="/app/advisor/requests",
            queue_items=queue_items,
            intervention_route=f"/app/advisor/interventions/{advisory_case_id}",
            intervention_log=tuple(sorted(intervention_log, key=lambda item: (item.occurred_at, item.case_id))),
        )

    def audit(self, surface: AdvisorWorkbenchSurface) -> AdvisorWorkbenchAudit:
        issues: list[str] = []
        if len(surface.queue_items) < 2:
            issues.append("advisor_queue_incomplete")
        if not surface.intervention_route.startswith("/app/advisor/interventions/"):
            issues.append("intervention_route_invalid")
        return AdvisorWorkbenchAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="advisor-follow-up-tests",
            ux_data_check_id="F-020",
        )
