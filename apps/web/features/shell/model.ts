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
  "transporter",
  "investor",
  "extension_agent",
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
    transporter: "Transporter",
    investor: "Investor",
    extension_agent: "Extension Agent",
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
  const defaults: NavigationItem[] = [
    { href: homeRouteForRole(role), label: "Home" },
    { href: "/app/market/listings", label: "Market" },
    { href: "/app/market/negotiations", label: "Inbox", badgeCount: queueCount },
    { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
    { href: "/app/profile", label: "Profile" },
    { href: "/app/settings", label: "Settings" },
  ];

  const byRole: Partial<Record<ActorRole, NavigationItem[]>> = {
    cooperative: [
      { href: "/app/cooperative", label: "Home" },
      { href: "/app/cooperative/dispatch", label: "Dispatch" },
      { href: "/app/market/listings", label: "Listings" },
      { href: "/app/payments/wallet", label: "Wallet" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    transporter: [
      { href: "/app/transporter", label: "Home" },
      { href: "/app/cooperative/dispatch", label: "Loads" },
      { href: "/app/payments/wallet", label: "Earnings" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    investor: [
      { href: "/app/investor", label: "Home" },
      { href: "/app/fund", label: "AgroFund" },
      { href: "/app/payments/wallet", label: "Portfolio" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    extension_agent: [
      { href: "/app/extension_agent", label: "Home" },
      { href: "/app/advisor/requests", label: "Requests" },
      { href: "/app/weather", label: "Weather" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    advisor: [
      { href: "/app/advisor", label: "Home" },
      { href: "/app/advisor/requests", label: "Requests" },
      { href: "/app/weather", label: "Weather" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    finance: [
      { href: "/app/finance", label: "Home" },
      { href: "/app/finance/queue", label: "Queue", badgeCount: queueCount },
      { href: "/app/payments/wallet", label: "Wallet" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
    admin: [
      { href: "/app/admin", label: "Home" },
      { href: "/app/admin/analytics", label: "Analytics" },
      { href: "/app/notifications", label: "Notifications", badgeCount: notificationsCount },
      { href: "/app/profile", label: "Profile" },
      { href: "/app/settings", label: "Settings" },
    ],
  };

  return byRole[role] ?? defaults;
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

  const roleMatch = pathname.match(
    /^\/app\/(farmer|buyer|cooperative|transporter|investor|extension_agent|advisor|finance|admin)(\/|$)/,
  );
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
