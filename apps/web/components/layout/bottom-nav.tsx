"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import type { ComponentType } from "react";

import * as Icons from "@/components/icons";
import { defaultMobileNavItems, type NavItem } from "./nav-items";

interface BottomNavProps {
  ariaLabel?: string;
  items?: NavItem[];
}

function resolveIcon(name: string) {
  return (Icons as Record<string, ComponentType<{ className?: string; size?: number }>>)[name] ?? Icons.HomeIcon;
}

function isItemActive(pathname: string | null, item: NavItem): boolean {
  const candidates = item.matchHrefs?.length ? item.matchHrefs : [item.href];

  return candidates.some((candidate) => pathname === candidate || pathname?.startsWith(`${candidate}/`));
}

export function BottomNav({ ariaLabel = "Mobile navigation", items }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = items ?? defaultMobileNavItems;

  return (
    <nav aria-label={ariaLabel} className="ds-bottom-nav">
      <div className="ds-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = resolveIcon(item.icon);
          const active = isItemActive(pathname, item);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className="ds-bottom-nav-item"
              href={item.href}
              key={item.id}
            >
              <span className="ds-bottom-nav-icon-wrap">
                <Icon className="ds-bottom-nav-icon" size={20} />
                {item.badge ? <span className="ds-bottom-nav-badge">{item.badge}</span> : null}
              </span>
              <span>{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
