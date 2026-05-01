export const activeLocaleCodes = ["en-GH", "en-NG"] as const;
export const plannedLocaleCodes = ["en-JM", "pcm-NG", "ha-NG", "yo-NG", "ig-NG", "tw-GH", "ak-GH"] as const;

export type ActiveLocaleCode = (typeof activeLocaleCodes)[number];
export type PlannedLocaleCode = (typeof plannedLocaleCodes)[number];
export type LocaleCode = ActiveLocaleCode | PlannedLocaleCode;
export type LocaleStatus = "active" | "planned";
export type DateFormatPreference = "day-month-year";
export type NumberFormatPreference = "grouped-decimal";
export type UnitPreference = "metric";
export type ReadingLevelBand = "plain" | "standard";
export type SupportedCurrencyCode = "GHS" | "NGN" | "USD" | "JMD";

export interface LocaleOption {
  code: LocaleCode;
  displayName: string;
  description: string;
  status: LocaleStatus;
}

interface LocaleDefinition extends LocaleOption {
  countryCode: string;
  currencyCode: SupportedCurrencyCode;
  fallbackLocale: ActiveLocaleCode;
  languageCode: string;
  numberFormatPreference: NumberFormatPreference;
  dateFormatPreference: DateFormatPreference;
  unitPreference: UnitPreference;
  translationPackVersion: string;
}

export interface LocaleProfile {
  locale: LocaleCode;
  effectiveLocale: ActiveLocaleCode;
  status: LocaleStatus;
  label: string;
  description: string;
  languageCode: string;
  countryCode: string;
  currencyCode: SupportedCurrencyCode;
  dateFormatPreference: DateFormatPreference;
  numberFormatPreference: NumberFormatPreference;
  unitPreference: UnitPreference;
  readingLevelBand: ReadingLevelBand;
  translationPackVersion: string;
  fallbackNotice: string | null;
}

const localeDefinitions: Record<LocaleCode, LocaleDefinition> = {
  "en-GH": {
    code: "en-GH",
    displayName: "English (Ghana)",
    description: "Active English pack for Ghanaian users, currency, and date conventions.",
    status: "active",
    countryCode: "GH",
    currencyCode: "GHS",
    fallbackLocale: "en-GH",
    languageCode: "en",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "2026.04-eh1a.1",
  },
  "en-NG": {
    code: "en-NG",
    displayName: "English (Nigeria)",
    description: "Active English pack for Nigerian users, currency, and date conventions.",
    status: "active",
    countryCode: "NG",
    currencyCode: "NGN",
    fallbackLocale: "en-NG",
    languageCode: "en",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "2026.04-eh1a.1",
  },
  "en-JM": {
    code: "en-JM",
    displayName: "English (Jamaica)",
    description: "Planned English pack for Jamaica. The interface falls back to the nearest reviewed English pack until it ships.",
    status: "planned",
    countryCode: "JM",
    currencyCode: "JMD",
    fallbackLocale: "en-GH",
    languageCode: "en",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "pcm-NG": {
    code: "pcm-NG",
    displayName: "Nigerian Pidgin",
    description: "Planned pack for lower-literacy rollout in Nigeria after English governance and QA gates are complete.",
    status: "planned",
    countryCode: "NG",
    currencyCode: "NGN",
    fallbackLocale: "en-NG",
    languageCode: "pcm",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "ha-NG": {
    code: "ha-NG",
    displayName: "Hausa",
    description: "Planned Hausa pack for regulated and marketplace-critical flows in Nigeria.",
    status: "planned",
    countryCode: "NG",
    currencyCode: "NGN",
    fallbackLocale: "en-NG",
    languageCode: "ha",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "yo-NG": {
    code: "yo-NG",
    displayName: "Yoruba",
    description: "Planned Yoruba pack for regulated and marketplace-critical flows in Nigeria.",
    status: "planned",
    countryCode: "NG",
    currencyCode: "NGN",
    fallbackLocale: "en-NG",
    languageCode: "yo",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "ig-NG": {
    code: "ig-NG",
    displayName: "Igbo",
    description: "Planned Igbo pack for regulated and marketplace-critical flows in Nigeria.",
    status: "planned",
    countryCode: "NG",
    currencyCode: "NGN",
    fallbackLocale: "en-NG",
    languageCode: "ig",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "tw-GH": {
    code: "tw-GH",
    displayName: "Twi",
    description: "Planned Twi pack for Ghanaian onboarding, marketplace, and trust-state flows.",
    status: "planned",
    countryCode: "GH",
    currencyCode: "GHS",
    fallbackLocale: "en-GH",
    languageCode: "tw",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
  "ak-GH": {
    code: "ak-GH",
    displayName: "Akan",
    description: "Planned Akan variant pack for Ghana after Twi/English governance is stable.",
    status: "planned",
    countryCode: "GH",
    currencyCode: "GHS",
    fallbackLocale: "en-GH",
    languageCode: "ak",
    numberFormatPreference: "grouped-decimal",
    dateFormatPreference: "day-month-year",
    unitPreference: "metric",
    translationPackVersion: "planned",
  },
};

const localeAliases: Record<string, LocaleCode> = {
  ak: "ak-GH",
  "ak-gh": "ak-GH",
  en: "en-GH",
  "en-gh": "en-GH",
  "en-jm": "en-JM",
  "en-ng": "en-NG",
  ha: "ha-NG",
  "ha-ng": "ha-NG",
  ig: "ig-NG",
  "ig-ng": "ig-NG",
  pcm: "pcm-NG",
  "pcm-ng": "pcm-NG",
  tw: "tw-GH",
  "tw-gh": "tw-GH",
  yo: "yo-NG",
  "yo-ng": "yo-NG",
};

const countryDefaults: Record<string, LocaleCode> = {
  GH: "en-GH",
  JM: "en-JM",
  NG: "en-NG",
};

export function isActiveLocale(locale: string): locale is ActiveLocaleCode {
  return activeLocaleCodes.includes(locale as ActiveLocaleCode);
}

export function localeFromCountry(countryCode: string | null | undefined): LocaleCode {
  if (!countryCode) {
    return "en-GH";
  }
  return countryDefaults[countryCode.toUpperCase()] ?? "en-GH";
}

export function normalizeLocaleCode(
  input: string | null | undefined,
  countryHint?: string | null,
): LocaleCode {
  if (!input) {
    return localeFromCountry(countryHint);
  }

  const normalized = input.trim().toLowerCase();
  if (localeAliases[normalized]) {
    return localeAliases[normalized];
  }

  const [language] = normalized.split("-");
  if (language && localeAliases[language]) {
    return localeAliases[language];
  }

  return localeFromCountry(countryHint);
}

export function resolveLocaleProfile(input: {
  countryCode?: string | null;
  preferredLocale?: string | null;
  readingLevelBand?: ReadingLevelBand | null;
  sessionLocale?: string | null;
}): LocaleProfile {
  const resolvedLocale = normalizeLocaleCode(
    input.preferredLocale ?? input.sessionLocale,
    input.countryCode,
  );
  const definition = localeDefinitions[resolvedLocale];
  const fallbackDefinition = localeDefinitions[definition.fallbackLocale];
  const readingLevelBand = input.readingLevelBand ?? "plain";

  return {
    locale: resolvedLocale,
    effectiveLocale: definition.status === "active" ? definition.code as ActiveLocaleCode : definition.fallbackLocale,
    status: definition.status,
    label: definition.displayName,
    description: definition.description,
    languageCode: definition.languageCode,
    countryCode: definition.countryCode,
    currencyCode: definition.currencyCode,
    dateFormatPreference: definition.dateFormatPreference,
    numberFormatPreference: definition.numberFormatPreference,
    unitPreference: definition.unitPreference,
    readingLevelBand,
    translationPackVersion:
      definition.status === "active"
        ? definition.translationPackVersion
        : `${fallbackDefinition.translationPackVersion}+fallback`,
    fallbackNotice:
      definition.status === "active"
        ? null
        : `${definition.displayName} is not live yet. Showing ${fallbackDefinition.displayName}.`,
  };
}

export function getActiveLocaleOptions(): LocaleOption[] {
  return activeLocaleCodes.map((localeCode) => localeDefinitions[localeCode]);
}

export function getPlannedLocaleOptions(countryCode?: string | null): LocaleOption[] {
  return plannedLocaleCodes
    .map((localeCode) => localeDefinitions[localeCode])
    .filter((item) => !countryCode || item.countryCode === countryCode.toUpperCase());
}

export function currencyOptionsForLocale(locale: string | null | undefined): Array<{
  label: string;
  value: SupportedCurrencyCode;
}> {
  const profile = resolveLocaleProfile({ preferredLocale: locale });
  const ordered = [
    profile.currencyCode,
    ...(["GHS", "NGN", "USD", "JMD"] as const).filter((value) => value !== profile.currencyCode),
  ];

  return ordered.map((value) => ({
    label: value,
    value,
  }));
}
