from agro_v2.frontend_app_shell import AppRole, ShellLayout, UnifiedAppShell
from agro_v2.offline_queue import ConnectivityState


def test_mobile_farmer_shell_keeps_queue_first_with_five_item_nav():
    shell = UnifiedAppShell()

    snapshot = shell.build_snapshot(
        role=AppRole.FARMER,
        width_px=320,
        pending_count=3,
        notifications_badge_count=2,
        queue_proof_count=1,
        connectivity_state=ConnectivityState.OFFLINE,
    )
    audit = shell.audit_home(snapshot)

    assert snapshot.layout == ShellLayout.MOBILE
    assert [item.label for item in snapshot.navigation_items] == [
        "Home",
        "Market",
        "Inbox",
        "Alerts",
        "Profile",
    ]
    assert snapshot.outbox_badge_visible is True
    assert snapshot.auth_entry_route == "/signin?role=farmer"
    assert audit.passed is True
    assert audit.ux_journey_id == "FJ-R01"


def test_desktop_finance_shell_adds_role_specific_queue_module():
    shell = UnifiedAppShell()

    snapshot = shell.build_snapshot(
        role=AppRole.FINANCE,
        width_px=1440,
        pending_count=5,
        notifications_badge_count=1,
    )

    assert snapshot.layout == ShellLayout.DESKTOP
    assert snapshot.home_route == "/app/finance"
    assert snapshot.navigation_items[1].label == "Queue"
    assert snapshot.queue_summary.primary_cta == "Start review"


def test_shell_audit_flags_missing_cross_role_switch():
    shell = UnifiedAppShell()
    snapshot = shell.build_snapshot(
        role=AppRole.BUYER,
        width_px=375,
        pending_count=2,
        notifications_badge_count=0,
        cross_role_switch_enabled=False,
    )

    audit = shell.audit_home(snapshot)

    assert audit.passed is False
    assert "cross_role_switch_disabled" in audit.issues
