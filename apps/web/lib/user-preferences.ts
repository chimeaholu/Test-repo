import type { IdentitySession } from "@agrodomain/contracts";

import { readJson, writeJson } from "@/lib/api-client";

export const USER_PREFERENCES_KEY = "agrodomain.user-preferences.v1";
export const USER_PREFERENCES_EVENT = "agrodomain:user-preferences";

export type NotificationCategory = "trade" | "finance" | "weather" | "advisory" | "system";
export type AppLanguage = "en" | "tw" | "ha" | "yo" | "pcm";
export type CurrencyFormat = "GHS" | "USD";

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
    language: AppLanguage;
    currency: CurrencyFormat;
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

function defaultNotificationCategories(): Record<NotificationCategory, boolean> {
  return {
    trade: true,
    finance: true,
    weather: true,
    advisory: true,
    system: true,
  };
}

function emitUserPreferencesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_PREFERENCES_EVENT));
  }
}

function defaultLanguage(session: IdentitySession): AppLanguage {
  const locale = session.actor.locale.toLowerCase();
  if (locale.startsWith("tw")) {
    return "tw";
  }
  if (locale.startsWith("ha")) {
    return "ha";
  }
  if (locale.startsWith("yo")) {
    return "yo";
  }
  if (locale.startsWith("pcm")) {
    return "pcm";
  }
  return "en";
}

export function defaultPreferences(session: IdentitySession): UserPreferences {
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
      language: defaultLanguage(session),
      currency: session.actor.country_code === "GH" ? "GHS" : "USD",
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

export function readUserPreferences(session: IdentitySession): UserPreferences {
  const base = defaultPreferences(session);
  const store = readStore();
  const current = store[session.actor.actor_id];
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
      ...current?.display,
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
