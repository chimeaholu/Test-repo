"use client";

import Link from "next/link";
import React from "react";

import { BrandMark } from "@/components/brand-mark";
import { BellIcon, MenuIcon } from "@/components/icons";
import type { LocaleProfile } from "@/lib/i18n/config";
import type { MessageCatalog } from "@/lib/i18n/messages";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";

interface TopBarProps {
  copy: MessageCatalog["shell"];
  countryCode?: string;
  demoWatermark?: string;
  isDemoTenant?: boolean;
  localeProfile: LocaleProfile;
  notificationCount?: number;
  onMenuToggle?: () => void;
  operatorCanSwitchPersonas?: boolean;
  organizationName?: string;
  roleLabel?: string;
  userName?: string;
}

export function TopBar({
  copy,
  countryCode,
  demoWatermark,
  isDemoTenant,
  localeProfile,
  notificationCount,
  onMenuToggle,
  operatorCanSwitchPersonas,
  organizationName,
  roleLabel,
  userName,
}: TopBarProps) {
  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        {onMenuToggle ? (
          <IconButton className="ds-mobile-menu-trigger" label={copy.actions.openNavigation} onClick={onMenuToggle} size="md">
            <MenuIcon size={20} />
          </IconButton>
        ) : null}

        <div className="ds-topbar-copy">
          <BrandMark className="ds-topbar-brandmark" compact />
          <div className="ds-topbar-pills">
            <span className={`ds-badge ${isDemoTenant ? "ds-badge-neutral" : "ds-badge-success"}`}>
              {isDemoTenant ? "Guided preview" : copy.topbar.liveWorkspace}
            </span>
            {roleLabel ? <span className="ds-badge ds-badge-brand">{roleLabel}</span> : null}
            {countryCode ? <span className="ds-badge ds-badge-neutral">{countryCode}</span> : null}
            <span className="ds-badge ds-badge-neutral">{`${copy.topbar.localeLabel}: ${localeProfile.effectiveLocale}`}</span>
            {operatorCanSwitchPersonas ? <span className="ds-badge ds-badge-neutral">Preview controls</span> : null}
          </div>
          <strong>{organizationName ?? copy.brand.workspaceFallback}</strong>
          <span>{isDemoTenant ? demoWatermark : copy.topbar.tagline}</span>
        </div>
      </div>

      <div className="ds-topbar-right">
        <Link aria-label={copy.topbar.notifications} className="ds-topbar-link" href="/app/notifications">
          <span className="ds-topbar-link-icon">
            <BellIcon size={18} />
            {notificationCount ? <span className="ds-topbar-count">{notificationCount}</span> : null}
          </span>
          <span className="ds-topbar-link-label">{copy.topbar.notifications}</span>
        </Link>

        <Link className="ds-topbar-profile" href="/app/profile">
          <Avatar name={userName ?? "Agrodomain"} size="sm" />
          <span className="ds-topbar-profile-copy">
            <strong>{userName ?? copy.brand.workspaceUserFallback}</strong>
            <span>{roleLabel ?? copy.topbar.signedIn}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
