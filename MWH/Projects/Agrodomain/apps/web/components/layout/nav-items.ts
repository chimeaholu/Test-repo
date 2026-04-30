import type { ActorRole } from "@agrodomain/contracts";

import type { MessageCatalog } from "@/lib/i18n/messages";

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
export type ShellNavigationCopy = MessageCatalog["shell"]["navigation"];
export type ShellSectionCopy = MessageCatalog["shell"]["sections"];

function navItem(input: NavItem): NavItem {
  return input;
}

function roleHome(role: ActorRole, labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href: `/app/${role}`,
    icon: "DashboardIcon",
    id: "dashboard",
    label: labels?.dashboard ?? "Dashboard",
    matchHrefs: [`/app/${role}`],
  });
}

function accountItems(
  counts?: NavCounts,
  sectionLabels?: ShellSectionCopy,
  labels?: ShellNavigationCopy,
): NavSection {
  return {
    title: sectionLabels?.account ?? "Account",
    items: [
      navItem({
        badge: counts?.notificationCount ?? 0,
        href: "/app/notifications",
        icon: "NotificationIcon",
        id: "notifications",
        label: labels?.notifications ?? "Notifications",
        mobileLabel: labels?.alerts ?? "Alerts",
        matchHrefs: ["/app/notifications"],
      }),
      navItem({
        href: "/app/profile",
        icon: "ProfileIcon",
        id: "profile",
        label: labels?.profile ?? "Profile",
        matchHrefs: ["/app/profile"],
      }),
      navItem({
        href: "/app/settings",
        icon: "SettingsIcon",
        id: "settings",
        label: labels?.settings ?? "Settings",
        matchHrefs: ["/app/settings"],
      }),
    ],
  };
}

function marketplaceItem(labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href: "/app/market/listings",
    icon: "MarketIcon",
    id: "marketplace",
    label: labels?.marketplace ?? "Marketplace",
    mobileLabel: labels?.market ?? "Market",
    matchHrefs: ["/app/market/listings"],
  });
}

function agroIntelligenceItem(label = "AgroIntelligence"): NavItem {
  return navItem({
    href: "/app/agro-intelligence",
    icon: "AnalyticsIcon",
    id: "agro-intelligence",
    label,
    matchHrefs: ["/app/agro-intelligence"],
    mobileLabel: "Intel",
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

function negotiationItem(counts?: NavCounts, labels?: ShellNavigationCopy): NavItem {
  return navItem({
    badge: counts?.queueCount ?? 0,
    href: "/app/market/negotiations",
    icon: "NegotiationIcon",
    id: "negotiations",
    label: labels?.negotiations ?? "Negotiations",
    mobileLabel: labels?.deals ?? "Deals",
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

function climateItem(label: string, labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href: "/app/weather",
    icon: "SunIcon",
    id: "weather",
    label,
    mobileLabel: labels?.weather ?? "Weather",
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

function advisorQueueItem(labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href: "/app/advisor/requests",
    icon: "AdvisoryIcon",
    id: "requests",
    label: labels?.requests ?? "Requests",
    matchHrefs: ["/app/advisor/requests"],
  });
}

function dispatchItem(labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href: "/app/cooperative/dispatch",
    icon: "TruckIcon",
    id: "dispatch",
    label: labels?.dispatch ?? "Dispatch",
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

function analyticsItem(href = "/app/analytics", labels?: ShellNavigationCopy): NavItem {
  return navItem({
    href,
    icon: "AnalyticsIcon",
    id: "analytics",
    label: labels?.analytics ?? "Analytics",
    matchHrefs: [href, "/app/insights"],
  });
}

function financeQueueItem(counts?: NavCounts, labels?: ShellNavigationCopy): NavItem {
  return navItem({
    badge: counts?.queueCount ?? 0,
    href: "/app/finance/queue",
    icon: "FundIcon",
    id: "queue",
    label: labels?.queue ?? "Queue",
    matchHrefs: ["/app/finance/queue"],
  });
}

const builderByRole: Record<
  RoleNavKey,
  (
    counts?: NavCounts,
    sectionLabels?: ShellSectionCopy,
    labels?: ShellNavigationCopy,
  ) => NavSection[]
> = {
  admin: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("admin", labels),
        agroIntelligenceItem(),
        analyticsItem("/app/admin/analytics", labels),
        marketplaceItem(labels),
        negotiationItem(counts, labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem()] },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [
        dispatchItem(labels),
        climateItem(labels?.weather ?? "Weather", labels),
        advisoryItem("operations-advisory", labels?.advisory ?? "Advisory"),
      ],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  advisor: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("advisor", labels),
        agroIntelligenceItem(),
        advisorQueueItem(labels),
        climateItem(labels?.weather ?? "Weather", labels),
      ],
    },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [marketplaceItem(labels), advisoryItem()],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  buyer: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("buyer", labels),
        agroIntelligenceItem(),
        marketplaceItem(labels),
        negotiationItem(counts, labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem()] },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [truckerItem(), climateItem(labels?.weather ?? "Weather", labels), advisoryItem()],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  cooperative: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("cooperative", labels),
        agroIntelligenceItem(),
        dispatchItem(labels),
        marketplaceItem(labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem()] },
    {
      title: sectionLabels?.intelligence ?? "Intelligence",
      items: [
        truckerItem(),
        climateItem(labels?.weather ?? "Weather", labels),
        advisoryItem("operations-advisory", labels?.advisory ?? "Advisory"),
        analyticsItem("/app/analytics", labels),
      ],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  extension_agent: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("extension_agent", labels),
        agroIntelligenceItem(),
        advisorQueueItem(labels),
        climateItem(labels?.weather ?? "Weather", labels),
      ],
    },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [marketplaceItem(labels), advisoryItem()],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  farmer: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("farmer", labels),
        agroIntelligenceItem(),
        farmItem(),
        marketplaceItem(labels),
        negotiationItem(counts, labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem(), insuranceItem()] },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [truckerItem(), climateItem(labels?.weather ?? "Weather", labels), advisoryItem()],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  finance: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("finance", labels),
        agroIntelligenceItem(),
        financeQueueItem(counts, labels),
        negotiationItem(counts, labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem()] },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [marketplaceItem(labels), climateItem(labels?.signals ?? "Signals", labels)],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  investor: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [roleHome("investor", labels), agroIntelligenceItem(), fundItem(), marketplaceItem(labels)],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem("Portfolio")] },
    {
      title: sectionLabels?.intelligence ?? "Intelligence",
      items: [
        negotiationItem(counts, labels),
        climateItem(labels?.signals ?? "Signals", labels),
        advisoryItem(),
      ],
    },
    accountItems(counts, sectionLabels, labels),
  ],
  transporter: (counts, sectionLabels, labels) => [
    {
      title: sectionLabels?.core ?? "Core",
      items: [
        roleHome("transporter", labels),
        agroIntelligenceItem(),
        truckerItem(),
        negotiationItem(counts, labels),
      ],
    },
    { title: sectionLabels?.finance ?? "Finance", items: [walletItem("Earnings")] },
    {
      title: sectionLabels?.operations ?? "Operations",
      items: [marketplaceItem(labels), climateItem(labels?.weather ?? "Weather", labels)],
    },
    accountItems(counts, sectionLabels, labels),
  ],
};

const mobileTopFiveByRole: Record<RoleNavKey, string[]> = {
  admin: ["dashboard", "agro-intelligence", "analytics", "notifications", "profile"],
  advisor: ["dashboard", "agro-intelligence", "weather", "notifications", "profile"],
  buyer: ["dashboard", "agro-intelligence", "marketplace", "notifications", "profile"],
  cooperative: ["dashboard", "agro-intelligence", "dispatch", "notifications", "profile"],
  extension_agent: ["dashboard", "agro-intelligence", "weather", "notifications", "profile"],
  farmer: ["dashboard", "agro-intelligence", "farm", "notifications", "profile"],
  finance: ["dashboard", "agro-intelligence", "queue", "notifications", "profile"],
  investor: ["dashboard", "agro-intelligence", "fund", "notifications", "profile"],
  transporter: ["dashboard", "agro-intelligence", "trucker", "notifications", "profile"],
};

export function getNavForRole(
  role: RoleNavKey,
  counts?: NavCounts,
  sectionLabels?: ShellSectionCopy,
  labels?: ShellNavigationCopy,
): NavSection[] {
  return builderByRole[role](counts, sectionLabels, labels);
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

export function mobileNavItems(
  role: RoleNavKey,
  counts?: NavCounts,
  sectionLabels?: ShellSectionCopy,
  labels?: ShellNavigationCopy,
): NavItem[] {
  const order = mobileTopFiveByRole[role];
  const items = getNavForRole(role, counts, sectionLabels, labels).flatMap((section) => section.items);

  return order
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item))
    .slice(0, 5);
}

export const defaultMobileNavItems: NavItem[] = mobileNavItems("farmer");
