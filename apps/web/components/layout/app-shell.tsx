"use client";

import dynamic from "next/dynamic";
import React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { LocaleProfile } from "@/lib/i18n/config";
import type { MessageCatalog } from "@/lib/i18n/messages";
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
  demoWatermark?: string;
  email?: string;
  isDemoTenant?: boolean;
  notificationCount?: number;
  onSignOut?: () => void;
  operatorCanSwitchPersonas?: boolean;
  organizationName?: string;
  queueCount?: number;
  role: RoleNavKey;
  roleLabel: string;
  shellCopy: MessageCatalog["shell"];
  localeProfile: LocaleProfile;
  userName?: string;
}

export function AppShell({
  agroGuideEnabled,
  banner,
  children,
  countryCode,
  demoWatermark,
  email,
  isDemoTenant,
  notificationCount,
  onSignOut,
  operatorCanSwitchPersonas,
  organizationName,
  queueCount,
  role,
  roleLabel,
  shellCopy,
  localeProfile,
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
  const sections = getNavForRole(
    role,
    counts,
    shellCopy.sections,
    shellCopy.navigation,
  );
  const mobileItems = mobileNavItems(
    role,
    counts,
    shellCopy.sections,
    shellCopy.navigation,
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setAgroGuideOpen(false);
  }, [pathname]);

  return (
    <div className="ds-app-shell" data-role={role}>
      <Sidebar
        collapsed={collapsed}
        email={email}
        onSignOut={onSignOut ?? (() => {})}
        onToggle={() => setCollapsed((current) => !current)}
        copy={shellCopy}
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
        copy={shellCopy}
        organizationName={organizationName}
        roleLabel={roleLabel}
        sections={sections}
        userName={userName}
        variant="drawer"
      />

      <div className={`ds-app-main${collapsed ? " ds-app-main-collapsed" : ""}`}>
        <TopBar
          countryCode={countryCode}
          copy={shellCopy}
          demoWatermark={demoWatermark}
          isDemoTenant={isDemoTenant}
          localeProfile={localeProfile}
          notificationCount={notificationCount}
          onMenuToggle={() => setMobileOpen(true)}
          operatorCanSwitchPersonas={operatorCanSwitchPersonas}
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

      <BottomNav ariaLabel={shellCopy.mobileNavigationLabel} items={mobileItems} />

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
