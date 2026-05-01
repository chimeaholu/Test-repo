import {
  resolveLocaleProfile,
  type ActiveLocaleCode,
  type LocaleProfile,
} from "@/lib/i18n/config";

export interface MessageCatalog {
  shell: {
    sections: {
      account: string;
      core: string;
      finance: string;
      intelligence: string;
      operations: string;
    };
    navigation: {
      advisory: string;
      alerts: string;
      analytics: string;
      dashboard: string;
      deals: string;
      dispatch: string;
      market: string;
      marketplace: string;
      negotiations: string;
      notifications: string;
      profile: string;
      queue: string;
      requests: string;
      settings: string;
      signals: string;
      weather: string;
    };
    brand: {
      mark: string;
      tag: string;
      workspaceFallback: string;
      workspaceUserFallback: string;
    };
    actions: {
      closeMenu: string;
      closeNavigation: string;
      collapseSidebar: string;
      expandSidebar: string;
      openNavigation: string;
      signOut: string;
    };
    topbar: {
      liveWorkspace: string;
      localeLabel: string;
      notifications: string;
      signedIn: string;
      tagline: string;
    };
    mobileNavigationLabel: string;
    sync: {
      ariaLabel: string;
      forceOnline: string;
      handoffLabel: string;
      lowConnectivity: string;
      offline: string;
      online: string;
      simulateDegraded: string;
      simulateOffline: string;
      summary: string;
      title: string;
    };
  };
  consent: {
    accessBody: string;
    backToSignIn: string;
    consentDetailsEyebrow: string;
    consentReviewBody: string;
    consentReviewTitle: string;
    grantConsent: string;
    grantConsentBusy: string;
    identityConfirmed: string;
    identityScopeBody: string;
    identityScopeTitle: string;
    onboardingEyebrow: string;
    plainLanguageRule: string;
    policyLabel: string;
    protectedActionsLocked: string;
    recordedImmediately: string;
    scopePrompt: string;
    workflowScopeBody: string;
    workflowScopeTitle: string;
    workspaceAccess: string;
  };
  settings: {
    activeLocalesBody: string;
    activeLocalesTitle: string;
    comingSoonBody: string;
    comingSoonTitle: string;
    localeFallbackTitle: string;
    localeSectionLabel: string;
    localeStatusActive: string;
    localeStatusPlanned: string;
    readingLevelPlain: string;
    readingLevelStandard: string;
    readingLevelTitle: string;
    regionLabel: string;
    regionPrompt: string;
  };
}

export interface MessageGovernanceEntry {
  owner: "product";
  qaGate: "low_literacy_review" | "translation_readiness";
  reviewState: "approved";
  contentClass:
    | "ui_microcopy"
    | "transactional_copy"
    | "educational_copy"
    | "system_message";
  readingLevelBand: "plain" | "standard";
}

const baseShellCatalog = {
  sections: {
    account: "Account",
    core: "Workspace",
    finance: "Money",
    intelligence: "Growth",
    operations: "Operations",
  },
  navigation: {
    advisory: "AgroGuide",
    alerts: "Alerts",
    analytics: "Insights",
    dashboard: "Workspace",
    deals: "Deals",
    dispatch: "Dispatch",
    market: "Market",
    marketplace: "Market",
    negotiations: "Offers",
    notifications: "Updates",
    profile: "Profile",
    queue: "Reviews",
    requests: "Requests",
    settings: "Settings",
    signals: "Signals",
    weather: "Weather",
  },
  brand: {
    mark: "Agrodomain",
    tag: "Sell, protect, move",
    workspaceFallback: "Agrodomain workspace",
    workspaceUserFallback: "Workspace user",
  },
  actions: {
    closeMenu: "Close menu",
    closeNavigation: "Close navigation",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    openNavigation: "Open navigation",
    signOut: "Sign out",
  },
  topbar: {
    liveWorkspace: "Live workspace",
    localeLabel: "Locale pack",
    notifications: "Updates",
    signedIn: "Signed in",
    tagline: "Sell, move, protect, and plan from one place.",
  },
  mobileNavigationLabel: "Mobile navigation",
  sync: {
    ariaLabel: "Sync status",
    forceOnline: "Stay online",
    handoffLabel: "Saved on",
    lowConnectivity: "Limited updates",
    offline: "Offline",
    online: "Online",
    simulateDegraded: "Limited mode",
    simulateOffline: "Work offline",
    summary:
      "Saved work: {actionableCount}. Needs attention: {conflictedCount}. Cached views: {cachedCount}. Local copies: {localCount}. Older copies: {staleCount}.",
    title: "Your work stays saved, even when the signal drops.",
  },
} as const satisfies MessageCatalog["shell"];

const catalogs: Record<ActiveLocaleCode, MessageCatalog> = {
  "en-GH": {
    shell: baseShellCatalog,
    consent: {
      accessBody: "Once consent is granted, your workspace opens. The same policy checks still run on the server.",
      backToSignIn: "Back to sign in",
      consentDetailsEyebrow: "Consent details",
      consentReviewBody: "Review what we record, why we need it, and which actions stay locked until you agree.",
      consentReviewTitle: "Review access before the workspace opens",
      grantConsent: "Grant consent",
      grantConsentBusy: "Granting consent...",
      identityConfirmed: "Identity confirmed",
      identityScopeBody: "Needed to load the correct workspace and verify your identity state.",
      identityScopeTitle: "Identity scope",
      onboardingEyebrow: "Consent and access",
      plainLanguageRule: "Keep this simple: say what we record, why we need it, and what stays blocked.",
      policyLabel: "Policy",
      protectedActionsLocked: "Protected actions locked",
      recordedImmediately: "Recorded immediately",
      scopePrompt: "Select the consent scopes you accept",
      workflowScopeBody: "Needed where regulated actions, approvals, or evidence retention apply.",
      workflowScopeTitle: "Workflow scope",
      workspaceAccess: "Workspace access",
    },
    settings: {
      activeLocalesBody: "Only reviewed English packs for Ghana and Nigeria are live today. Choose the pack that best matches how dates, currency, and trust copy should render.",
      activeLocalesTitle: "Active locale packs",
      comingSoonBody: "Planned packs stay visible for planning only. They stay out of production until review and low-literacy QA pass.",
      comingSoonTitle: "Planned language packs",
      localeFallbackTitle: "Fallback notice",
      localeSectionLabel: "Interface locale",
      localeStatusActive: "Live",
      localeStatusPlanned: "Planned",
      readingLevelPlain: "Plain English",
      readingLevelStandard: "Standard English",
      readingLevelTitle: "Reading level",
      regionLabel: "Region",
      regionPrompt: "Select a region",
    },
  },
  "en-NG": {
    shell: baseShellCatalog,
    consent: {
      accessBody: "Once consent is granted, your workspace opens. The same policy checks still run on the server.",
      backToSignIn: "Back to sign in",
      consentDetailsEyebrow: "Consent details",
      consentReviewBody: "Review what we record, why we need it, and which actions stay locked until you agree.",
      consentReviewTitle: "Review access before the workspace opens",
      grantConsent: "Grant consent",
      grantConsentBusy: "Granting consent...",
      identityConfirmed: "Identity confirmed",
      identityScopeBody: "Needed to load the correct workspace and verify your identity state.",
      identityScopeTitle: "Identity scope",
      onboardingEyebrow: "Consent and access",
      plainLanguageRule: "Keep this simple: say what we record, why we need it, and what stays blocked.",
      policyLabel: "Policy",
      protectedActionsLocked: "Protected actions locked",
      recordedImmediately: "Recorded immediately",
      scopePrompt: "Select the consent scopes you accept",
      workflowScopeBody: "Needed where regulated actions, approvals, or evidence retention apply.",
      workflowScopeTitle: "Workflow scope",
      workspaceAccess: "Workspace access",
    },
    settings: {
      activeLocalesBody: "Only reviewed English packs for Nigeria and Ghana are live today. Choose the pack that best matches how dates, currency, and trust copy should render.",
      activeLocalesTitle: "Active locale packs",
      comingSoonBody: "Planned packs stay visible for planning only. They stay out of production until review and low-literacy QA pass.",
      comingSoonTitle: "Planned language packs",
      localeFallbackTitle: "Fallback notice",
      localeSectionLabel: "Interface locale",
      localeStatusActive: "Live",
      localeStatusPlanned: "Planned",
      readingLevelPlain: "Plain English",
      readingLevelStandard: "Standard English",
      readingLevelTitle: "Reading level",
      regionLabel: "State or region",
      regionPrompt: "Select a state or region",
    },
  },
};

export const messageGovernance: Record<string, MessageGovernanceEntry> = {
  consent: {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "transactional_copy",
    readingLevelBand: "plain",
  },
  settings: {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "educational_copy",
    readingLevelBand: "plain",
  },
  "shell.brand": {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
  "shell.navigation": {
    owner: "product",
    qaGate: "low_literacy_review",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
  "shell.actions": {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
  "shell.mobileNavigationLabel": {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
  "shell.sections": {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
  "shell.sync": {
    owner: "product",
    qaGate: "low_literacy_review",
    reviewState: "approved",
    contentClass: "system_message",
    readingLevelBand: "plain",
  },
  "shell.topbar": {
    owner: "product",
    qaGate: "translation_readiness",
    reviewState: "approved",
    contentClass: "ui_microcopy",
    readingLevelBand: "plain",
  },
};

function flattenCatalog(
  value: string | Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  if (typeof value === "string") {
    return { [prefix]: value };
  }

  return Object.entries(value).reduce<Record<string, string>>((accumulator, [key, nextValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return {
      ...accumulator,
      ...flattenCatalog(nextValue as string | Record<string, unknown>, nextPrefix),
    };
  }, {});
}

export function getLocaleMessages(locale: LocaleProfile | string | null | undefined): MessageCatalog {
  const profile = typeof locale === "object" && locale && "effectiveLocale" in locale
    ? locale
    : resolveLocaleProfile({ preferredLocale: locale });

  return catalogs[profile.effectiveLocale];
}

export function listCatalogStrings(locale: ActiveLocaleCode): Record<string, string> {
  return flattenCatalog(catalogs[locale] as unknown as Record<string, unknown>);
}

export function interpolate(message: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message,
  );
}
