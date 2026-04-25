import type { ActorRole } from "@agrodomain/contracts";

export interface NavItem {
  badge?: number;
  href: string;
  icon: string;
  id: string;
  label: string;
  matchHrefs?: string[];
  mobileLabel?: string;
}

export interface NavSection {
  items: NavItem[];
  title?: string;
}

export interface NavCounts {
  notificationCount?: number;
  queueCount?: number;
}

export type RoleNavKey = ActorRole;

function navItem(input: NavItem): NavItem {
  return input;
}

function roleHome(role: ActorRole): NavItem {
  return navItem({
    href: `/app/${role}`,
    icon: "DashboardIcon",
    id: "dashboard",
    label: "Dashboard",
    matchHrefs: [`/app/${role}`],
  });
}

function accountItems(counts?: NavCounts): NavSection {
  return {
    title: "Account",
    items: [
      navItem({
        badge: counts?.notificationCount ?? 0,
        href: "/app/notifications",
        icon: "NotificationIcon",
        id: "notifications",
        label: "Notifications",
        mobileLabel: "Alerts",
        matchHrefs: ["/app/notifications"],
      }),
      navItem({
        href: "/app/profile",
        icon: "ProfileIcon",
        id: "profile",
        label: "Profile",
        matchHrefs: ["/app/profile"],
      }),
      navItem({
        href: "/app/settings",
        icon: "SettingsIcon",
        id: "settings",
        label: "Settings",
        matchHrefs: ["/app/settings"],
      }),
    ],
  };
}

function marketplaceItem(): NavItem {
  return navItem({
    href: "/app/market/listings",
    icon: "MarketIcon",
    id: "marketplace",
    label: "Marketplace",
    mobileLabel: "Market",
    matchHrefs: ["/app/market/listings"],
  });
}

function farmItem(label = "AgroFarm"): NavItem {
  return navItem({
    href: "/app/farm",
    icon: "FieldIcon",
    id: "farm",
    label,
    mobileLabel: "Farm",
    matchHrefs: ["/app/farm"],
  });
}

function negotiationItem(counts?: NavCounts): NavItem {
  return navItem({
    badge: counts?.queueCount ?? 0,
    href: "/app/market/negotiations",
    icon: "NegotiationIcon",
    id: "negotiations",
    label: "Negotiations",
    mobileLabel: "Deals",
    matchHrefs: ["/app/market/negotiations"],
  });
}

function walletItem(label = "Wallet"): NavItem {
  return navItem({
    href: "/app/payments/wallet",
    icon: "WalletIcon",
    id: "wallet",
    label,
    matchHrefs: ["/app/payments/wallet"],
  });
}

function fundItem(label = "AgroFund"): NavItem {
  return navItem({
    href: "/app/fund",
    icon: "FundIcon",
    id: "fund",
    label,
    matchHrefs: ["/app/fund"],
  });
}

function insuranceItem(label = "AgroShield"): NavItem {
  return navItem({
    href: "/app/insurance",
    icon: "InsuranceIcon",
    id: "insurance",
    label,
    matchHrefs: ["/app/insurance"],
  });
}

function climateItem(label = "Weather"): NavItem {
  return navItem({
    href: "/app/weather",
    icon: "SunIcon",
    id: "weather",
    label,
    mobileLabel: "Weather",
    matchHrefs: ["/app/weather", "/app/climate/alerts"],
  });
}

function advisoryItem(id = "advisory", label = "AgroGuide"): NavItem {
  return navItem({
    href: "/app/advisory/new",
    icon: "AdvisoryIcon",
    id,
    label,
    matchHrefs: ["/app/advisory/new"],
  });
}

function advisorQueueItem(): NavItem {
  return navItem({
    href: "/app/advisor/requests",
    icon: "AdvisoryIcon",
    id: "requests",
    label: "Requests",
    matchHrefs: ["/app/advisor/requests"],
  });
}

function dispatchItem(): NavItem {
  return navItem({
    href: "/app/cooperative/dispatch",
    icon: "TruckIcon",
    id: "dispatch",
    label: "Dispatch",
    matchHrefs: ["/app/cooperative/dispatch"],
  });
}

function truckerItem(label = "AgroTrucker"): NavItem {
  return navItem({
    href: "/app/trucker",
    icon: "TruckIcon",
    id: "trucker",
    label,
    matchHrefs: ["/app/trucker"],
  });
}

function analyticsItem(): NavItem {
  return navItem({
    href: "/app/admin/analytics",
    icon: "AnalyticsIcon",
    id: "analytics",
    label: "Analytics",
    matchHrefs: ["/app/admin/analytics"],
  });
}

function financeQueueItem(counts?: NavCounts): NavItem {
  return navItem({
    badge: counts?.queueCount ?? 0,
    href: "/app/finance/queue",
    icon: "FundIcon",
    id: "queue",
    label: "Queue",
    matchHrefs: ["/app/finance/queue"],
  });
}

const builderByRole: Record<RoleNavKey, (counts?: NavCounts) => NavSection[]> = {
  admin: (counts) => [
    { title: "Core", items: [roleHome("admin"), analyticsItem(), marketplaceItem(), negotiationItem(counts)] },
    { title: "Finance", items: [walletItem()] },
    { title: "Operations", items: [dispatchItem(), climateItem(), advisoryItem("operations-advisory", "Advisory")] },
    accountItems(counts),
  ],
  advisor: (counts) => [
    { title: "Core", items: [roleHome("advisor"), advisorQueueItem(), climateItem()] },
    { title: "Operations", items: [marketplaceItem(), advisoryItem()] },
    accountItems(counts),
  ],
  buyer: (counts) => [
    { title: "Core", items: [roleHome("buyer"), marketplaceItem(), negotiationItem(counts)] },
    { title: "Finance", items: [walletItem()] },
    { title: "Operations", items: [truckerItem(), climateItem(), advisoryItem()] },
    accountItems(counts),
  ],
  cooperative: (counts) => [
    { title: "Core", items: [roleHome("cooperative"), dispatchItem(), marketplaceItem()] },
    { title: "Finance", items: [walletItem()] },
    { title: "Intelligence", items: [truckerItem(), climateItem(), advisoryItem("operations-advisory", "Advisory"), analyticsItem()] },
    accountItems(counts),
  ],
  extension_agent: (counts) => [
    { title: "Core", items: [roleHome("extension_agent"), advisorQueueItem(), climateItem()] },
    { title: "Operations", items: [marketplaceItem(), advisoryItem()] },
    accountItems(counts),
  ],
  farmer: (counts) => [
    { title: "Core", items: [roleHome("farmer"), farmItem(), marketplaceItem(), negotiationItem(counts)] },
    { title: "Finance", items: [walletItem(), insuranceItem()] },
    { title: "Operations", items: [truckerItem(), climateItem(), advisoryItem()] },
    accountItems(counts),
  ],
  finance: (counts) => [
    { title: "Core", items: [roleHome("finance"), financeQueueItem(counts), negotiationItem(counts)] },
    { title: "Finance", items: [walletItem()] },
    { title: "Operations", items: [marketplaceItem(), climateItem("Signals")] },
    accountItems(counts),
  ],
  investor: (counts) => [
    { title: "Core", items: [roleHome("investor"), fundItem(), marketplaceItem()] },
    { title: "Finance", items: [walletItem("Portfolio")] },
    { title: "Intelligence", items: [negotiationItem(counts), climateItem("Signals"), advisoryItem()] },
    accountItems(counts),
  ],
  transporter: (counts) => [
    { title: "Core", items: [roleHome("transporter"), truckerItem(), negotiationItem(counts)] },
    { title: "Finance", items: [walletItem("Earnings")] },
    { title: "Operations", items: [marketplaceItem(), climateItem()] },
    accountItems(counts),
  ],
};

const mobileTopFiveByRole: Record<RoleNavKey, string[]> = {
  admin: ["dashboard", "analytics", "marketplace", "notifications", "profile"],
  advisor: ["dashboard", "requests", "weather", "notifications", "profile"],
  buyer: ["dashboard", "marketplace", "negotiations", "notifications", "profile"],
  cooperative: ["dashboard", "dispatch", "marketplace", "notifications", "profile"],
  extension_agent: ["dashboard", "requests", "weather", "notifications", "profile"],
  farmer: ["dashboard", "farm", "marketplace", "notifications", "profile"],
  finance: ["dashboard", "queue", "wallet", "notifications", "profile"],
  investor: ["dashboard", "fund", "wallet", "notifications", "profile"],
  transporter: ["dashboard", "trucker", "wallet", "notifications", "profile"],
};

export function getNavForRole(role: RoleNavKey, counts?: NavCounts): NavSection[] {
  return builderByRole[role](counts);
}

export const roleNavigation: Record<RoleNavKey, NavSection[]> = {
  admin: builderByRole.admin(),
  advisor: builderByRole.advisor(),
  buyer: builderByRole.buyer(),
  cooperative: builderByRole.cooperative(),
  extension_agent: builderByRole.extension_agent(),
  farmer: builderByRole.farmer(),
  finance: builderByRole.finance(),
  investor: builderByRole.investor(),
  transporter: builderByRole.transporter(),
};

export function mobileNavItems(role: RoleNavKey, counts?: NavCounts): NavItem[] {
  const order = mobileTopFiveByRole[role];
  const items = getNavForRole(role, counts).flatMap((section) => section.items);

  return order
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
    .slice(0, 5);
}

export const defaultMobileNavItems: NavItem[] = mobileNavItems("farmer");
