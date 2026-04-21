"""F-021 admin analytics and observability route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .enterprise_analytics_mart import EnterpriseAnalyticsMartRow
from .frontend_app_shell import AppRole, AppShellSnapshot
from .observability import SloAlertDecision


class FrontendAdminAnalyticsError(ValueError):
    """Raised when admin analytics or health surfaces lose bounded observability posture."""


@dataclass(frozen=True)
class AnalyticsMetricCard:
    label: str
    value: str


@dataclass(frozen=True)
class ObservabilityAlertRow:
    slo_id: str
    severity: str
    operation: str
    detail_route: str


@dataclass(frozen=True)
class AdminAnalyticsSurface:
    analytics_route: str
    observability_route: str
    metric_cards: tuple[AnalyticsMetricCard, ...]
    alert_rows: tuple[ObservabilityAlertRow, ...]


@dataclass(frozen=True)
class AdminAnalyticsAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendAdminAnalytics:
    """Builds analytics and observability cockpit surfaces for admin users."""

    def build_surface(
        self,
        *,
        shell_snapshot: AppShellSnapshot,
        mart_row: EnterpriseAnalyticsMartRow,
        slo_decisions: tuple[SloAlertDecision, ...],
    ) -> AdminAnalyticsSurface:
        if shell_snapshot.role != AppRole.ADMIN:
            raise FrontendAdminAnalyticsError("admin analytics requires admin shell snapshot")
        metric_cards = (
            AnalyticsMetricCard("Country", mart_row.country_code),
            AnalyticsMetricCard("Commodity", mart_row.commodity_code),
            AnalyticsMetricCard("Custody stage", mart_row.custody_stage),
            AnalyticsMetricCard("High-risk signals", str(mart_row.high_risk_signal_count)),
            AnalyticsMetricCard("Traceability events", str(mart_row.traceability_event_count)),
        )
        alert_rows = tuple(
            ObservabilityAlertRow(
                slo_id=decision.slo_id,
                severity=decision.severity,
                operation=decision.operation,
                detail_route=f"/app/admin/observability#{decision.slo_id}",
            )
            for decision in sorted(slo_decisions, key=lambda item: (item.severity, item.slo_id))
        )
        return AdminAnalyticsSurface(
            analytics_route="/app/admin/analytics",
            observability_route="/app/admin/observability",
            metric_cards=metric_cards,
            alert_rows=alert_rows,
        )

    def audit(self, surface: AdminAnalyticsSurface) -> AdminAnalyticsAudit:
        issues: list[str] = []
        if len(surface.metric_cards) < 4:
            issues.append("analytics_cards_missing")
        if not surface.alert_rows:
            issues.append("observability_alerts_missing")
        return AdminAnalyticsAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-R05",
            ux_data_check_id="F-021",
        )
