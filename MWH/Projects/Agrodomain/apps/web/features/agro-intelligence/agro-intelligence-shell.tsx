"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAppState } from "@/components/app-provider";
import {
  ActionLink,
  SectionHeading,
  StatusPill,
  SurfaceCard,
} from "@/components/ui-primitives";
import {
  getConnectivityLabel,
  getCountryLabel,
  isDemoSession,
  isOperatorRole,
} from "./model";

type ShellTab = {
  href?: string;
  label: string;
  matchPrefixes?: string[];
  muted?: boolean;
};

function shellTabs(canReview: boolean): ShellTab[] {
  return [
    {
      href: "/app/agro-intelligence",
      label: "Overview",
    },
    {
      href: "/app/agro-intelligence/buyers",
      label: "Buyers",
      matchPrefixes: ["/app/agro-intelligence/buyers"],
    },
    {
      href: "/app/agro-intelligence/graph",
      label: "Network",
      matchPrefixes: ["/app/agro-intelligence/graph"],
    },
    ...(canReview
      ? [
          {
            href: "/app/agro-intelligence/workspace",
            label: "Review workspace",
            matchPrefixes: ["/app/agro-intelligence/workspace"],
          },
        ]
      : []),
    { label: "Logistics next", muted: true },
    { label: "Suppliers next", muted: true },
  ];
}

export function AgroIntelligenceShell(props: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow?: string;
  queueCount?: number;
  title: string;
}) {
  const pathname = usePathname();
  const { queue, session } = useAppState();

  if (!session) {
    return <div className="content-stack">{props.children}</div>;
  }

  const canReview = isOperatorRole(session.actor.role);
  const isDemo = isDemoSession(session);
  const tabs = shellTabs(canReview);

  return (
    <div className="content-stack">
      <SurfaceCard className="hero-surface agro-intelligence-hero">
        <SectionHeading
          eyebrow={props.eyebrow ?? "AgroIntelligence"}
          title={props.title}
          body={props.description}
          actions={
            <>
              <StatusPill tone={props.queueCount && props.queueCount > 0 ? "degraded" : "online"}>
                Queue {props.queueCount ?? 0}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {getConnectivityLabel(queue.connectivity_state)}
              </StatusPill>
              <StatusPill tone="neutral">{getCountryLabel(session.actor.country_code)}</StatusPill>
              {isDemo ? <StatusPill tone="degraded">Demo data</StatusPill> : null}
            </>
          }
        />

        <div className="agro-shell-cta-row">
          <ActionLink href="/app/agro-intelligence/buyers" label="Open buyer directory" />
          <ActionLink href="/app/agro-intelligence/graph" label="Explore partner network" tone="secondary" />
          {canReview ? (
            <ActionLink href="/app/agro-intelligence/workspace" label="Review records" tone="ghost" />
          ) : (
            <ActionLink href="/app/advisory/new" label="Ask AgroGuide" tone="ghost" />
          )}
        </div>

        <nav
          aria-label="AgroIntelligence sections"
          className="agro-shell-nav"
        >
          {tabs.map((tab) => {
            const active = Boolean(
              tab.href &&
                (pathname === tab.href ||
                  tab.matchPrefixes?.some((prefix) => pathname?.startsWith(`${prefix}/`) || pathname === prefix)),
            );
            if (!tab.href) {
              return (
                <span className="agro-shell-nav-pill muted" key={tab.label}>
                  {tab.label}
                </span>
              );
            }
            return (
              <Link
                href={tab.href}
                key={tab.href}
                className={active ? "button-primary" : "button-ghost"}
              >
                {tab.label}
              </Link>
            );
          })}
          {props.actions}
        </nav>
      </SurfaceCard>

      {props.children}
    </div>
  );
}
