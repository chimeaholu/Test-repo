import type { IdentitySession } from "@agrodomain/contracts";

import { readJson, writeJson } from "@/lib/api-client";
import {
  resolveLocaleProfile,
  type ActiveLocaleCode,
  type ReadingLevelBand,
  type SupportedCurrencyCode,
} from "@/lib/i18n/config";

export const USER_PREFERENCES_KEY = "agrodomain.user-preferences.v1";
export const USER_PREFERENCES_EVENT = "agrodomain:user-preferences";

export type NotificationCategory =
  | "trade"
  | "finance"
  | "weather"
  | "advisory"
  | "system"
  | "copilot"
  | "transport";
export type AppLocale = ActiveLocaleCode;
export type CurrencyFormat = SupportedCurrencyCode;

export interface UserPreferences {
  notifications: {
    push: boolean;
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
    categories: Record<NotificationCategory, boolean>;
    readIds: string[];
  };
  display: {
    locale: AppLocale;
    currency: CurrencyFormat;
    readingLevelBand: ReadingLevelBand;
  };
  privacy: {
    shareProfile: boolean;
    analyticsOptOut: boolean;
  };
  profile: {
    city: string;
    region: string;
    memberSince: string | null;
    roleFocus: string;
  };
}

type PreferencesStore = Record<string, UserPreferences>;
type UserPreferencesPatch = {
  notifications?: Partial<UserPreferences["notifications"]> & {
    categories?: Partial<Record<NotificationCategory, boolean>>;
  };
  display?: Partial<UserPreferences["display"]>;
  privacy?: Partial<UserPreferences["privacy"]>;
  profile?: Partial<UserPreferences["profile"]>;
};

interface LegacyDisplayPreferences {
  currency?: CurrencyFormat;
  language?: string;
  locale?: string;
  readingLevelBand?: ReadingLevelBand;
}

function defaultNotificationCategories(): Record<NotificationCategory, boolean> {
  return {
    trade: true,
    finance: true,
    weather: true,
    advisory: true,
    system: true,
    copilot: true,
    transport: true,
  };
}

function emitUserPreferencesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_PREFERENCES_EVENT));
  }
}

export function defaultPreferences(session: IdentitySession): UserPreferences {
  const localeProfile = resolveLocaleProfile({
    countryCode: session.actor.country_code,
    sessionLocale: session.actor.locale,
  });

  return {
    notifications: {
      push: true,
      sms: true,
      email: Boolean(session.actor.email),
      whatsapp: session.actor.country_code !== "JM",
      categories: defaultNotificationCategories(),
      readIds: [],
    },
    display: {
      locale: localeProfile.effectiveLocale,
      currency: localeProfile.currencyCode,
      readingLevelBand: "plain",
    },
    privacy: {
      shareProfile: true,
      analyticsOptOut: false,
    },
    profile: {
      city: "",
      region: "",
      memberSince: session.consent.captured_at ?? null,
      roleFocus: "",
    },
  };
}

function readStore(): PreferencesStore {
  return readJson<PreferencesStore>(USER_PREFERENCES_KEY) ?? {};
}

function writeStore(store: PreferencesStore): void {
  writeJson(USER_PREFERENCES_KEY, store);
  emitUserPreferencesChanged();
}

function normalizeStoredLocale(
  display: LegacyDisplayPreferences | undefined,
  session: IdentitySession,
  fallback: AppLocale,
): AppLocale {
  const storedLocale = display?.locale ?? display?.language;
  if (typeof storedLocale !== "string" || storedLocale.length === 0) {
    return fallback;
  }

  return resolveLocaleProfile({
    countryCode: session.actor.country_code,
    preferredLocale: storedLocale,
    sessionLocale: session.actor.locale,
  }).effectiveLocale;
}

export function readUserPreferences(session: IdentitySession): UserPreferences {
  const base = defaultPreferences(session);
  const store = readStore();
  const current = store[session.actor.actor_id];
  const currentDisplay = current?.display as LegacyDisplayPreferences | undefined;

  return {
    ...base,
    ...current,
    notifications: {
      ...base.notifications,
      ...current?.notifications,
      categories: {
        ...base.notifications.categories,
        ...current?.notifications?.categories,
      },
      readIds: current?.notifications?.readIds ?? [],
    },
    display: {
      ...base.display,
      ...currentDisplay,
      locale: normalizeStoredLocale(currentDisplay, session, base.display.locale),
      readingLevelBand:
        currentDisplay?.readingLevelBand ?? base.display.readingLevelBand,
    },
    privacy: {
      ...base.privacy,
      ...current?.privacy,
    },
    profile: {
      ...base.profile,
      ...current?.profile,
    },
  };
}

export function writeUserPreferences(
  session: IdentitySession,
  next: UserPreferences,
): UserPreferences {
  const store = readStore();
  store[session.actor.actor_id] = next;
  writeStore(store);
  return next;
}

export function patchUserPreferences(
  session: IdentitySession,
  patch: UserPreferencesPatch,
): UserPreferences {
  const current = readUserPreferences(session);
  const next: UserPreferences = {
    ...current,
    ...patch,
    notifications: {
      ...current.notifications,
      ...patch.notifications,
      categories: {
        ...current.notifications.categories,
        ...patch.notifications?.categories,
      },
      readIds: patch.notifications?.readIds ?? current.notifications.readIds,
    },
    display: {
      ...current.display,
      ...patch.display,
    },
    privacy: {
      ...current.privacy,
      ...patch.privacy,
    },
    profile: {
      ...current.profile,
      ...patch.profile,
    },
  };
  return writeUserPreferences(session, next);
}

export function markNotificationReadState(
  session: IdentitySession,
  notificationId: string,
  read: boolean,
): UserPreferences {
  const current = readUserPreferences(session);
  const nextReadIds = new Set(current.notifications.readIds);
  if (read) {
    nextReadIds.add(notificationId);
  } else {
    nextReadIds.delete(notificationId);
  }
  return patchUserPreferences(session, {
    notifications: {
      ...current.notifications,
      readIds: Array.from(nextReadIds),
    },
  });
}

export function markAllNotificationsRead(
  session: IdentitySession,
  notificationIds: string[],
): UserPreferences {
  const current = readUserPreferences(session);
  const nextReadIds = new Set(current.notifications.readIds);
  for (const id of notificationIds) {
    nextReadIds.add(id);
  }
  return patchUserPreferences(session, {
    notifications: {
      ...current.notifications,
      readIds: Array.from(nextReadIds),
    },
  });
}
