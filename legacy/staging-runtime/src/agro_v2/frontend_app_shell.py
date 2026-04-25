"""F-001 unified app shell and role routing contract."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .offline_queue import ConnectivityState


class FrontendAppShellError(ValueError):
    """Raised when routed app-shell inputs violate the frontend contract."""


class AppRole(str, Enum):
    FARMER = "farmer"
    BUYER = "buyer"
    COOPERATIVE = "cooperative"
    ADVISOR = "advisor"
    FINANCE = "finance"
    ADMIN = "admin"


class ShellLayout(str, Enum):
    MOBILE = "mobile"
    TABLET = "tablet"
    DESKTOP = "desktop"


@dataclass(frozen=True)
class NavigationItem:
    label: str
    route: str
    badge_count: int = 0
    primary: bool = False

    def __post_init__(self) -> None:
        if not self.label.strip():
            raise FrontendAppShellError("label is required")
        if not self.route.startswith("/"):
            raise FrontendAppShellError("route must start with '/'")
        if self.badge_count < 0:
            raise FrontendAppShellError("badge_count must be >= 0")


@dataclass(frozen=True)
class QueueSummary:
    heading: str
    pending_count: int
    primary_cta: str
    proof_count: int = 0

    def __post_init__(self) -> None:
        if not self.heading.strip():
            raise FrontendAppShellError("heading is required")
        if self.pending_count < 0:
            raise FrontendAppShellError("pending_count must be >= 0")
        if not self.primary_cta.strip():
            raise FrontendAppShellError("primary_cta is required")
        if self.proof_count < 0:
            raise FrontendAppShellError("proof_count must be >= 0")


@dataclass(frozen=True)
class AppShellSnapshot:
    role: AppRole
    active_route: str
    home_route: str
    auth_entry_route: str
    layout: ShellLayout
    navigation_items: tuple[NavigationItem, ...]
    queue_summary: QueueSummary
    outbox_badge_visible: bool
    notifications_badge_count: int
    connectivity_state: ConnectivityState
    queue_first: bool
    cross_role_switch_enabled: bool
    primary_action_reachable: bool


@dataclass(frozen=True)
class ShellAuditResult:
    role: AppRole
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


ROLE_HOME_ROUTES = {
    AppRole.FARMER: "/app/farmer",
    AppRole.BUYER: "/app/buyer",
    AppRole.COOPERATIVE: "/app/cooperative",
    AppRole.ADVISOR: "/app/advisor",
    AppRole.FINANCE: "/app/finance",
    AppRole.ADMIN: "/app/admin",
}


class UnifiedAppShell:
    """Builds role-aware navigation without fragmenting the application surface."""

    def home_route_for(self, role: AppRole) -> str:
        return ROLE_HOME_ROUTES[role]

    def auth_entry_route(self, role: AppRole | None = None) -> str:
        if role is None:
            return "/signin"
        return f"/signin?role={role.value}"

    def layout_for_width(self, width_px: int) -> ShellLayout:
        if width_px < 320:
            raise FrontendAppShellError("width_px must be >= 320")
        if width_px < 768:
            return ShellLayout.MOBILE
        if width_px < 1180:
            return ShellLayout.TABLET
        return ShellLayout.DESKTOP

    def build_snapshot(
        self,
        *,
        role: AppRole,
        width_px: int,
        active_route: str | None = None,
        pending_count: int,
        notifications_badge_count: int,
        queue_proof_count: int = 0,
        connectivity_state: ConnectivityState = ConnectivityState.ONLINE,
        cross_role_switch_enabled: bool = True,
    ) -> AppShellSnapshot:
        if pending_count < 0:
            raise FrontendAppShellError("pending_count must be >= 0")
        if notifications_badge_count < 0:
            raise FrontendAppShellError("notifications_badge_count must be >= 0")
        if queue_proof_count < 0:
            raise FrontendAppShellError("queue_proof_count must be >= 0")

        layout = self.layout_for_width(width_px)
        home_route = self.home_route_for(role)
        current_route = active_route or home_route
        navigation_items = self._navigation_for(
            role=role,
            layout=layout,
            pending_count=pending_count,
            notifications_badge_count=notifications_badge_count,
        )
        queue_summary = self._queue_summary_for(role, pending_count, queue_proof_count)
        return AppShellSnapshot(
            role=role,
            active_route=current_route,
            home_route=home_route,
            auth_entry_route=self.auth_entry_route(role),
            layout=layout,
            navigation_items=navigation_items,
            queue_summary=queue_summary,
            outbox_badge_visible=connectivity_state != ConnectivityState.ONLINE or pending_count > 0,
            notifications_badge_count=notifications_badge_count,
            connectivity_state=connectivity_state,
            queue_first=True,
            cross_role_switch_enabled=cross_role_switch_enabled,
            primary_action_reachable=layout != ShellLayout.DESKTOP or width_px >= 320,
        )

    def audit_home(self, snapshot: AppShellSnapshot) -> ShellAuditResult:
        issues: list[str] = []
        if snapshot.active_route != snapshot.home_route:
            issues.append("not_on_home_route")
        if not snapshot.queue_first:
            issues.append("queue_not_prioritized")
        if snapshot.queue_summary.pending_count == 0:
            issues.append("pending_queue_missing")
        if not snapshot.cross_role_switch_enabled:
            issues.append("cross_role_switch_disabled")
        if snapshot.layout == ShellLayout.MOBILE and len(snapshot.navigation_items) > 5:
            issues.append("mobile_nav_overflow")
        if snapshot.layout == ShellLayout.MOBILE and not snapshot.primary_action_reachable:
            issues.append("primary_action_not_reachable")
        return ShellAuditResult(
            role=snapshot.role,
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-R01",
            ux_data_check_id="F-001",
        )

    def _navigation_for(
        self,
        *,
        role: AppRole,
        layout: ShellLayout,
        pending_count: int,
        notifications_badge_count: int,
    ) -> tuple[NavigationItem, ...]:
        home = NavigationItem("Home", self.home_route_for(role), primary=True)
        market = NavigationItem("Market", "/app/market/listings")
        inbox = NavigationItem("Inbox", "/app/market/negotiations", badge_count=pending_count)
        alerts = NavigationItem("Alerts", "/app/climate/alerts")
        profile = NavigationItem("Profile", "/app/profile", badge_count=notifications_badge_count)
        if layout == ShellLayout.MOBILE:
            return (home, market, inbox, alerts, profile)
        role_modules = {
            AppRole.COOPERATIVE: NavigationItem("Operations", "/app/cooperative/dispatch"),
            AppRole.ADVISOR: NavigationItem("Requests", "/app/advisor/requests"),
            AppRole.FINANCE: NavigationItem("Queue", "/app/finance/queue"),
            AppRole.ADMIN: NavigationItem("Analytics", "/app/admin/analytics"),
        }
        items = [home, market, inbox, alerts, profile]
        extra = role_modules.get(role)
        if extra:
            items.insert(1, extra)
        return tuple(items)

    def _queue_summary_for(
        self,
        role: AppRole,
        pending_count: int,
        proof_count: int,
    ) -> QueueSummary:
        headings = {
            AppRole.FARMER: "Work to finish before you sell",
            AppRole.BUYER: "Purchases that need a decision",
            AppRole.COOPERATIVE: "Member actions waiting now",
            AppRole.ADVISOR: "Cases waiting for response",
            AppRole.FINANCE: "Reviews waiting for approval",
            AppRole.ADMIN: "Platform checks that need attention",
        }
        primary_actions = {
            AppRole.FARMER: "Finish setup",
            AppRole.BUYER: "Review offers",
            AppRole.COOPERATIVE: "Open dispatch queue",
            AppRole.ADVISOR: "Open case queue",
            AppRole.FINANCE: "Start review",
            AppRole.ADMIN: "Inspect health",
        }
        return QueueSummary(
            heading=headings[role],
            pending_count=max(1, pending_count),
            primary_cta=primary_actions[role],
            proof_count=proof_count,
        )
