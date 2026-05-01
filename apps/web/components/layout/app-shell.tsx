"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "./bottom-nav";
import { getNavForRole, mobileNavItems, type RoleNavKey } from "./nav-items";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

const AgroGuideAssistantPanel = dynamic(
  () =>
    import("@/components/agroguide").then((mod) => ({
      default: mod.AgroGuideAssistantPanel,
    })),
  { loading: () => null, ssr: false },
);

const AgroGuideFloatingButton = dynamic(
  () =>
    import("@/components/agroguide").then((mod) => ({
      default: mod.AgroGuideFloatingButton,
    })),
  { loading: () => null, ssr: false },
);

interface AppShellProps {
  agroGuideEnabled?: boolean;
  banner?: ReactNode;
  children: ReactNode;
  countryCode?: string;
  email?: string;
  notificationCount?: number;
  onSignOut?: () => void;
  organizationName?: string;
  queueCount?: number;
  role: RoleNavKey;
  roleLabel: string;
  userName?: string;
}

export function AppShell({
  agroGuideEnabled,
  banner,
  children,
  countryCode,
  email,
  notificationCount,
  onSignOut,
  organizationName,
  queueCount,
  role,
  roleLabel,
  userName,
}: AppShellProps) {
  const pathname = usePathname();
  const [agroGuideOpen, setAgroGuideOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const counts = {
    notificationCount,
    queueCount,
  };
  const sections = getNavForRole(role, counts);
  const mobileItems = mobileNavItems(role, counts);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setAgroGuideOpen(false);
  }, [pathname]);

  return (
    <div className="ds-app-shell">
      <Sidebar
        collapsed={collapsed}
        email={email}
        onSignOut={onSignOut ?? (() => {})}
        onToggle={() => setCollapsed((current) => !current)}
        organizationName={organizationName}
        roleLabel={roleLabel}
        sections={sections}
        userName={userName}
      />

      <Sidebar
        email={email}
        onClose={() => setMobileOpen(false)}
        onSignOut={onSignOut ?? (() => {})}
        open={mobileOpen}
        organizationName={organizationName}
        roleLabel={roleLabel}
        sections={sections}
        userName={userName}
        variant="drawer"
      />

      <div className={`ds-app-main${collapsed ? " ds-app-main-collapsed" : ""}`}>
        <TopBar
          countryCode={countryCode}
          notificationCount={notificationCount}
          onMenuToggle={() => setMobileOpen(true)}
          organizationName={organizationName}
          roleLabel={roleLabel}
          userName={userName}
        />

        <main className="ds-app-content" id="main-content">
          <div className="ds-shell-stack">
            {banner}
            {children}
          </div>
        </main>
      </div>

      <BottomNav items={mobileItems} />

      {agroGuideEnabled ? (
        <>
          {!agroGuideOpen ? (
            <AgroGuideFloatingButton hasSuggestions onClick={() => setAgroGuideOpen(true)} />
          ) : null}
          {agroGuideOpen ? (
            <AgroGuideAssistantPanel onClose={() => setAgroGuideOpen(false)} open={agroGuideOpen} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
