"use client";

import Link from "next/link";

import { BellIcon, MenuIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";

interface TopBarProps {
  countryCode?: string;
  notificationCount?: number;
  onMenuToggle?: () => void;
  organizationName?: string;
  roleLabel?: string;
  userName?: string;
}

export function TopBar({
  countryCode,
  notificationCount,
  onMenuToggle,
  organizationName,
  roleLabel,
  userName,
}: TopBarProps) {
  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        {onMenuToggle ? (
          <IconButton className="ds-mobile-menu-trigger" label="Open navigation" onClick={onMenuToggle} size="md">
            <MenuIcon size={20} />
          </IconButton>
        ) : null}

        <div className="ds-topbar-copy">
          <div className="ds-topbar-pills">
            {roleLabel ? <span className="ds-badge ds-badge-brand">{roleLabel}</span> : null}
            {countryCode ? <span className="ds-badge ds-badge-neutral">{countryCode}</span> : null}
          </div>
          <strong>{organizationName ?? "Agrodomain workspace"}</strong>
          <span>Your trade, funding, and farm operations workspace.</span>
        </div>
      </div>

      <div className="ds-topbar-right">
        <Link aria-label="Notifications" className="ds-topbar-link" href="/app/notifications">
          <span className="ds-topbar-link-icon">
            <BellIcon size={18} />
            {notificationCount ? <span className="ds-topbar-count">{notificationCount}</span> : null}
          </span>
          <span className="ds-topbar-link-label">Notifications</span>
        </Link>

        <Link className="ds-topbar-profile" href="/app/profile">
          <Avatar name={userName ?? "Agrodomain"} size="sm" />
          <span className="ds-topbar-profile-copy">
            <strong>{userName ?? "Workspace user"}</strong>
            <span>{roleLabel ?? "Profile"}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
