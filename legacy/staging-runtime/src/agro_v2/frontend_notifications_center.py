"""F-018 cross-domain notifications center route contract."""

from __future__ import annotations

from dataclasses import dataclass

from .notification_broker import NotificationBrokerPlan


class FrontendNotificationsCenterError(ValueError):
    """Raised when notification deep-link or delivery state surfaces are invalid."""


@dataclass(frozen=True)
class NotificationCenterItem:
    notification_id: str
    intent_type: str
    delivery_state: str
    channel_label: str
    detail_route: str


@dataclass(frozen=True)
class NotificationsCenterSurface:
    center_route: str
    items: tuple[NotificationCenterItem, ...]


@dataclass(frozen=True)
class NotificationsCenterAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendNotificationsCenter:
    """Projects broker plans into a route-safe cross-domain notification center."""

    def build_surface(
        self,
        *,
        plan_routes: tuple[tuple[NotificationBrokerPlan, str], ...],
    ) -> NotificationsCenterSurface:
        items = tuple(
            NotificationCenterItem(
                notification_id=plan.notification_id,
                intent_type=plan.intent_type.value,
                delivery_state=plan.final_state.value,
                channel_label=plan.final_channel.value if plan.final_channel is not None else "action_required",
                detail_route=detail_route,
            )
            for plan, detail_route in sorted(plan_routes, key=lambda item: item[0].notification_id)
        )
        return NotificationsCenterSurface(
            center_route="/app/notifications",
            items=items,
        )

    def audit(self, surface: NotificationsCenterSurface) -> NotificationsCenterAudit:
        issues: list[str] = []
        if not surface.items:
            issues.append("notifications_empty")
        for item in surface.items:
            if not item.detail_route.startswith("/app/"):
                issues.append("notification_deep_link_invalid")
                break
        return NotificationsCenterAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="notification-deep-link-tests",
            ux_data_check_id="F-018",
        )
