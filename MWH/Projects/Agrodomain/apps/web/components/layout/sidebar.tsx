"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import type { ComponentType } from "react";

import { BrandMark } from "@/components/brand-mark";
import * as Icons from "@/components/icons";
import type { MessageCatalog } from "@/lib/i18n/messages";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { type NavItem, type NavSection } from "./nav-items";

type SidebarVariant = "desktop" | "drawer";

interface SidebarProps {
  collapsed?: boolean;
  email?: string;
  onClose?: () => void;
  onSignOut: () => void;
  onToggle?: () => void;
  open?: boolean;
  copy: MessageCatalog["shell"];
  organizationName?: string;
  roleLabel?: string;
  sections: NavSection[];
  userName?: string;
  variant?: SidebarVariant;
}

function resolveIcon(name: string) {
  return (Icons as Record<string, ComponentType<{ className?: string; size?: number }>>)[name] ?? Icons.DashboardIcon;
}

function isItemActive(pathname: string | null, item: NavItem): boolean {
  const candidates = item.matchHrefs?.length ? item.matchHrefs : [item.href];

  return candidates.some((candidate) => pathname === candidate || pathname?.startsWith(`${candidate}/`));
}

export function Sidebar({
  collapsed = false,
  email,
  onClose,
  onSignOut,
  onToggle,
  open = false,
  copy,
  organizationName,
  roleLabel,
  sections,
  userName,
  variant = "desktop",
}: SidebarProps) {
  const pathname = usePathname();
  const isDrawer = variant === "drawer";
  const homeHref = sections[0]?.items[0]?.href ?? "/";
  const sidebarClassName = [
    "ds-sidebar",
    collapsed && !isDrawer ? "ds-sidebar-collapsed" : "",
    isDrawer ? "ds-sidebar-drawer" : "",
    isDrawer && open ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {isDrawer && open ? (
        <button
          aria-label={copy.actions.closeNavigation}
          className="ds-sidebar-overlay is-open"
          onClick={onClose}
          tabIndex={0}
          type="button"
        />
      ) : null}

      {isDrawer && !open ? null : (
        <aside className={sidebarClassName}>
          <div className="ds-sidebar-logo">
            <Link className="ds-sidebar-brand" href={homeHref}>
              <BrandMark
                caption={!collapsed || isDrawer ? copy.brand.tag : undefined}
                compact={collapsed && !isDrawer}
              />
            </Link>

            {isDrawer ? (
              <IconButton className="ds-sidebar-control" label={copy.actions.closeMenu} onClick={onClose} size="sm">
                <Icons.CloseIcon size={18} />
              </IconButton>
            ) : (
              <IconButton
                className="ds-sidebar-control"
                label={collapsed ? copy.actions.expandSidebar : copy.actions.collapseSidebar}
                onClick={onToggle}
                size="sm"
              >
                <Icons.ChevronLeftIcon className={collapsed ? "ds-sidebar-chevron-reversed" : undefined} size={18} />
              </IconButton>
            )}
          </div>

          {!collapsed || isDrawer ? (
            <div className="ds-sidebar-context">
              {roleLabel ? <span className="ds-sidebar-kicker">{roleLabel}</span> : null}
              <strong>{organizationName ?? copy.brand.workspaceFallback}</strong>
              {email ? <span>{email}</span> : null}
            </div>
          ) : null}

          <nav aria-label="Primary" className="ds-sidebar-nav">
            {sections.map((section) => (
              <div className="ds-sidebar-section" key={section.title ?? section.items[0]?.id}>
                {section.title && (!collapsed || isDrawer) ? (
                  <div className="ds-sidebar-section-title">{section.title}</div>
                ) : null}

                {section.items.map((item) => {
                  const Icon = resolveIcon(item.icon);
                  const active = isItemActive(pathname, item);

                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className="ds-sidebar-link"
                      href={item.href}
                      key={item.id}
                      title={collapsed && !isDrawer ? item.label : undefined}
                    >
                      <span className="ds-sidebar-icon-wrap">
                        <Icon className="ds-sidebar-icon" size={20} />
                      </span>
                      {!collapsed || isDrawer ? <span>{item.label}</span> : null}
                      {!collapsed || isDrawer ? (
                        item.badge ? <span className="ds-badge ds-badge-brand ds-sidebar-badge">{item.badge}</span> : null
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="ds-sidebar-footer">
            <Link className="ds-sidebar-profile" href="/app/profile">
              <Avatar name={userName ?? "Agrodomain"} size="sm" />
              {!collapsed || isDrawer ? (
                <span className="ds-sidebar-profile-copy">
                  <strong>{userName ?? copy.brand.workspaceUserFallback}</strong>
                  <span>{roleLabel ?? copy.topbar.signedIn}</span>
                </span>
              ) : null}
            </Link>

            <button className="ds-sidebar-link ds-sidebar-signout" onClick={onSignOut} type="button">
              <Icons.LogOutIcon className="ds-sidebar-icon" size={20} />
              {!collapsed || isDrawer ? <span>{copy.actions.signOut}</span> : null}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
