import {
  resolveLocaleProfile,
  type LocaleProfile,
  type SupportedCurrencyCode,
} from "@/lib/i18n/config";

type LocaleLike = LocaleProfile | string | null | undefined;
type UnitCode = "ton" | "kilogram" | "hectare" | "acre";

function profileFromInput(locale: LocaleLike): LocaleProfile {
  if (locale && typeof locale === "object" && "effectiveLocale" in locale) {
    return locale;
  }
  return resolveLocaleProfile({ preferredLocale: locale });
}

function asDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatCurrency(
  amount: number,
  options?: {
    currency?: SupportedCurrencyCode;
    locale?: LocaleLike;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string {
  const profile = profileFromInput(options?.locale);
  return new Intl.NumberFormat(profile.effectiveLocale, {
    style: "currency",
    currency: options?.currency ?? profile.currencyCode,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(amount);
}

export function formatNumber(
  value: number,
  options?: {
    locale?: LocaleLike;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  },
): string {
  const profile = profileFromInput(options?.locale);
  return new Intl.NumberFormat(profile.effectiveLocale, {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits,
  }).format(value);
}

export function formatDate(
  value: string | number | Date,
  options?: {
    locale?: LocaleLike;
    month?: "short" | "long" | "numeric" | "2-digit";
    day?: "numeric" | "2-digit";
    year?: "numeric" | "2-digit";
  },
): string {
  const profile = profileFromInput(options?.locale);
  return new Intl.DateTimeFormat(profile.effectiveLocale, {
    day: options?.day ?? "numeric",
    month: options?.month ?? "short",
    year: options?.year ?? "numeric",
  }).format(asDate(value));
}

export function formatDateTime(
  value: string | number | Date,
  options?: {
    includeSeconds?: boolean;
    locale?: LocaleLike;
  },
): string {
  const profile = profileFromInput(options?.locale);
  return new Intl.DateTimeFormat(profile.effectiveLocale, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    second: options?.includeSeconds ? "2-digit" : undefined,
    year: "numeric",
  }).format(asDate(value));
}

export function formatRelativeTime(
  value: string | number | Date,
  options?: {
    baseDate?: string | number | Date;
    locale?: LocaleLike;
  },
): string {
  const profile = profileFromInput(options?.locale);
  const date = asDate(value);
  const baseDate = options?.baseDate ? asDate(options.baseDate) : new Date();
  const diffMilliseconds = date.getTime() - baseDate.getTime();
  const diffSeconds = Math.round(diffMilliseconds / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(diffSeconds) >= size || unit === "second") {
      return new Intl.RelativeTimeFormat(profile.languageCode, {
        numeric: "auto",
      }).format(Math.round(diffSeconds / size), unit);
    }
  }

  return formatDate(date, { locale: profile });
}

export function formatUnit(
  value: number,
  unit: UnitCode,
  options?: {
    compact?: boolean;
    locale?: LocaleLike;
    maximumFractionDigits?: number;
  },
): string {
  const labelMap: Record<UnitCode, { compact: string; long: string }> = {
    acre: { compact: "ac", long: value === 1 ? "acre" : "acres" },
    hectare: { compact: "ha", long: value === 1 ? "hectare" : "hectares" },
    kilogram: { compact: "kg", long: value === 1 ? "kilogram" : "kilograms" },
    ton: { compact: "t", long: value === 1 ? "ton" : "tons" },
  };

  const formattedValue = formatNumber(value, {
    locale: options?.locale,
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  });

  return `${formattedValue} ${options?.compact ? labelMap[unit].compact : labelMap[unit].long}`;
}
