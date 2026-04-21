import type { ActorRole, IdentitySession } from "@agrodomain/contracts";

export interface NavigationItem {
  href: string;
  label: string;
  badgeCount?: number;
}

export const APP_ROLES = [
  "farmer",
  "buyer",
  "cooperative",
  "advisor",
  "finance",
  "admin",
] as const satisfies readonly ActorRole[];

export function isAppRole(value: string): value is ActorRole {
  return APP_ROLES.includes(value as ActorRole);
}

export function roleLabel(role: ActorRole): string {
  return {
    farmer: "Farmer",
    buyer: "Buyer",
    cooperative: "Cooperative",
    advisor: "Advisor",
    finance: "Finance",
    admin: "Admin",
  }[role];
}

export function homeRouteForRole(role: ActorRole): string {
  return `/app/${role}`;
}

export function navigationForRole(
  role: ActorRole,
  queueCount: number,
  notificationsCount: number,
): NavigationItem[] {
  const items: NavigationItem[] = [
    { href: homeRouteForRole(role), label: "Home" },
    { href: "/app/market/listings", label: "Market" },
    { href: "/app/market/negotiations", label: "Inbox", badgeCount: queueCount },
    { href: "/app/climate/alerts", label: "Alerts" },
    { href: "/app/profile", label: "Profile", badgeCount: notificationsCount },
  ];

  const roleSpecific = {
    cooperative: { href: "/app/cooperative/dispatch", label: "Operations" },
    advisor: { href: "/app/advisor/requests", label: "Requests" },
    finance: { href: "/app/finance/queue", label: "Queue" },
    admin: { href: "/app/admin/analytics", label: "Analytics" },
  } as const;

  const extra = roleSpecific[role as keyof typeof roleSpecific];
  return extra ? [items[0], extra, ...items.slice(1)] : items;
}

export function shellStatusTone(session: IdentitySession | null): "online" | "offline" | "degraded" | "neutral" {
  if (!session) {
    return "neutral";
  }
  if (session.consent.state === "consent_granted") {
    return "online";
  }
  if (session.consent.state === "consent_revoked") {
    return "offline";
  }
  return "degraded";
}

export interface RouteDecision {
  allowed: boolean;
  redirectTo: string | null;
  reason: "ok" | "signin_required" | "consent_required" | "role_mismatch";
}

export function getRouteDecision(
  pathname: string,
  session: IdentitySession | null,
): RouteDecision {
  const isProtected = pathname.startsWith("/app");
  if (!isProtected) {
    return { allowed: true, redirectTo: null, reason: "ok" };
  }

  if (!session) {
    return { allowed: false, redirectTo: "/signin", reason: "signin_required" };
  }

  const consentGranted = session.consent.state === "consent_granted";
  const consentAllowedPath =
    pathname === "/app/profile" ||
    pathname === "/onboarding/consent" ||
    pathname.startsWith("/app/offline");

  if (!consentGranted && !consentAllowedPath) {
    return {
      allowed: false,
      redirectTo: "/onboarding/consent",
      reason: "consent_required",
    };
  }

  const roleMatch = pathname.match(/^\/app\/(farmer|buyer|cooperative|advisor|finance|admin)(\/|$)/);
  if (roleMatch && roleMatch[1] !== session.actor.role) {
    return {
      allowed: false,
      redirectTo: homeRouteForRole(session.actor.role),
      reason: "role_mismatch",
    };
  }

  return { allowed: true, redirectTo: null, reason: "ok" };
}

export function createTraceId(route: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `trace-${route.replace(/\W+/g, "-").slice(-16)}-${suffix}`;
}
