"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAppState } from "@/components/app-provider";
import {
  getActiveLocaleOptions,
  getPlannedLocaleOptions,
  resolveLocaleProfile,
  type ReadingLevelBand,
} from "@/lib/i18n/config";
import { getLocaleMessages } from "@/lib/i18n/messages";
import {
  patchUserPreferences,
  readUserPreferences,
  type AppLocale,
  type CurrencyFormat,
  type NotificationCategory,
} from "@/lib/user-preferences";

const LOCALE_OPTIONS = getActiveLocaleOptions().map((option) => ({
  description: option.description,
  label: option.displayName,
  value: option.code as AppLocale,
}));

const READING_LEVEL_OPTIONS: Array<{ label: string; value: ReadingLevelBand }> = [
  { label: "Plain English", value: "plain" },
  { label: "Standard English", value: "standard" },
];

const CATEGORY_OPTIONS: Array<{ value: NotificationCategory; label: string; detail: string }> = [
  { value: "trade", label: "Trade updates", detail: "Negotiation changes, listing updates, and buyer activity." },
  { value: "finance", label: "Payment alerts", detail: "Money on hold, payout activity, and wallet changes." },
  { value: "weather", label: "Weather alerts", detail: "Climate warnings and risk signals tied to your locale." },
  { value: "advisory", label: "Guidance messages", detail: "Agronomy guidance, requests, and crop care updates." },
  { value: "copilot", label: "Workspace help", detail: "Task support, summaries, and helpful prompts inside the workspace." },
  { value: "transport", label: "Transport notices", detail: "Shipment coordination, driver handoff, and delivery status updates." },
  { value: "system", label: "Account notices", detail: "Permissions, security reminders, and account-level notices." },
];

const REGION_OPTIONS: Record<string, string[]> = {
  GH: [
    "Ahafo",
    "Ashanti",
    "Bono",
    "Bono East",
    "Central",
    "Eastern",
    "Greater Accra",
    "North East",
    "Northern",
    "Oti",
    "Savannah",
    "Upper East",
    "Upper West",
    "Volta",
    "Western",
    "Western North",
  ],
  JM: [
    "Clarendon",
    "Hanover",
    "Kingston",
    "Manchester",
    "Portland",
    "Saint Andrew",
    "Saint Ann",
    "Saint Catherine",
    "Saint Elizabeth",
    "Saint James",
    "Saint Mary",
    "Saint Thomas",
    "Trelawny",
    "Westmoreland",
  ],
  NG: [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Benue",
    "Cross River",
    "Delta",
    "Federal Capital Territory",
    "Kaduna",
    "Kano",
    "Katsina",
    "Lagos",
    "Nasarawa",
    "Ogun",
    "Oyo",
    "Plateau",
    "Rivers",
  ],
};

export function SettingsPageClient() {
  const { session, updateSession } = useAppState();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [locale, setLocale] = useState<AppLocale>("en-GH");
  const [currency, setCurrency] = useState<CurrencyFormat>("GHS");
  const [readingLevelBand, setReadingLevelBand] = useState<ReadingLevelBand>("plain");
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [categories, setCategories] = useState<Record<NotificationCategory, boolean>>({
    trade: true,
    finance: true,
    weather: true,
    advisory: true,
    copilot: true,
    transport: true,
    system: true,
  });
  const [shareProfile, setShareProfile] = useState(true);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const localeProfile = session
    ? resolveLocaleProfile({
        countryCode: session.actor.country_code,
        preferredLocale: locale,
        readingLevelBand,
        sessionLocale: session.actor.locale,
      })
    : null;
  const messages = getLocaleMessages(localeProfile).settings;
  const plannedLocales = session ? getPlannedLocaleOptions(session.actor.country_code) : [];
  const regionOptions = session ? REGION_OPTIONS[session.actor.country_code] ?? [] : [];

  useEffect(() => {
    if (!session) {
      return;
    }
    const prefs = readUserPreferences(session);
    setFullName(session.actor.display_name);
    setEmail(session.actor.email);
    setRegion(prefs.profile.region);
    setCity(prefs.profile.city);
    setLocale(prefs.display.locale);
    setCurrency(prefs.display.currency);
    setReadingLevelBand(prefs.display.readingLevelBand);
    setPush(prefs.notifications.push);
    setSms(prefs.notifications.sms);
    setEmailNotifications(prefs.notifications.email);
    setWhatsapp(prefs.notifications.whatsapp);
    setCategories(prefs.notifications.categories);
    setShareProfile(prefs.privacy.shareProfile);
    setAnalyticsOptOut(prefs.privacy.analyticsOptOut);
  }, [session]);

  const isDirty = useMemo(() => {
    if (!session) {
      return false;
    }
    const prefs = readUserPreferences(session);
    return (
      fullName !== session.actor.display_name ||
      email !== session.actor.email ||
      region !== prefs.profile.region ||
      city !== prefs.profile.city ||
      locale !== prefs.display.locale ||
      currency !== prefs.display.currency ||
      readingLevelBand !== prefs.display.readingLevelBand ||
      push !== prefs.notifications.push ||
      sms !== prefs.notifications.sms ||
      emailNotifications !== prefs.notifications.email ||
      whatsapp !== prefs.notifications.whatsapp ||
      CATEGORY_OPTIONS.some((option) => categories[option.value] !== prefs.notifications.categories[option.value]) ||
      shareProfile !== prefs.privacy.shareProfile ||
      analyticsOptOut !== prefs.privacy.analyticsOptOut
    );
  }, [
    analyticsOptOut,
    categories,
    city,
    currency,
    email,
    emailNotifications,
    fullName,
    locale,
    push,
    readingLevelBand,
    region,
    session,
    shareProfile,
    sms,
    whatsapp,
  ]);

  if (!session) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    patchUserPreferences(session, {
      notifications: {
        ...readUserPreferences(session).notifications,
        push,
        sms,
        email: emailNotifications,
        whatsapp,
        categories,
      },
      display: {
        locale,
        currency,
        readingLevelBand,
      },
      privacy: {
        shareProfile,
        analyticsOptOut,
      },
      profile: {
        ...readUserPreferences(session).profile,
        city,
        region,
      },
    });

    updateSession({
      ...session,
      actor: {
        ...session.actor,
        display_name: fullName.trim() || session.actor.display_name,
        email: email.trim() || session.actor.email,
        locale,
      },
    });

    setIsSaving(false);
    setMessage("Settings updated successfully");
  };

  const handleUseCurrentLocation = () => {
    setMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRegion(region || "Greater Accra");
        setCity(`GPS ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
        setMessage("Location updated");
      },
      () => {
        setMessage("Unable to access your current location.");
      },
    );
  };

  return (
    <div className="r3-page-stack" role="main" aria-label="Settings">
      <SurfaceHeader title="Settings" backHref="/app/profile" />
      {message ? <div className="r3-inline-banner">{message}</div> : null}

      <section className="r3-settings-section" aria-label="Profile">
        <h2>Account and security</h2>
        <div className="r3-settings-card r3-settings-profile-grid">
          <div className="r3-profile-photo">
            <div>{fullName.slice(0, 1).toUpperCase()}</div>
            <button className="button-ghost" type="button">
              Change Photo
            </button>
          </div>
          <div className="r3-form-grid">
            <label className="field">
              <span>Full Name</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input disabled value="+233 XX XXX XXXX" />
            </label>
            <label className="field">
              <span>Email (optional)</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <div className="r3-form-actions">
              <button
                className="button-primary"
                type="button"
                disabled={!isDirty || isSaving}
                onClick={() => void handleSave()}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="r3-settings-section" aria-label="Notifications">
        <h2>Alerts and updates</h2>
        <div className="r3-settings-card">
          <ToggleRow checked={push} label="Push Notifications" onChange={setPush} />
          <ToggleRow checked={sms} label="SMS Alerts" onChange={setSms} />
          <ToggleRow checked={emailNotifications} label="Email Notifications" onChange={setEmailNotifications} />
          <ToggleRow checked={whatsapp} label="WhatsApp Updates" onChange={setWhatsapp} />
          <div className="r3-settings-divider" />
          <div className="stack-sm">
            <h3>Update types</h3>
            <p className="muted">Turn views on or off based on the parts of the business you want to hear about most.</p>
          </div>
          {CATEGORY_OPTIONS.map((option) => (
            <ToggleRow
              checked={categories[option.value]}
              detail={option.detail}
              key={option.value}
              label={option.label}
              onChange={(value) => setCategories((current) => ({ ...current, [option.value]: value }))}
            />
          ))}
        </div>
      </section>

      <section className="r3-settings-section" aria-label={messages.localeSectionLabel}>
        <h2>{messages.localeSectionLabel}</h2>
        <div className="r3-settings-card">
          <div className="stack-sm">
            <h3>{messages.activeLocalesTitle}</h3>
            <p className="muted">{messages.activeLocalesBody}</p>
          </div>
          {LOCALE_OPTIONS.map((option) => (
            <label className="r3-radio-row" key={option.value}>
              <input
                checked={locale === option.value}
                name="locale"
                onChange={() => setLocale(option.value)}
                type="radio"
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
          <div className="r3-settings-divider" />
          <div className="stack-sm">
            <h3>{messages.readingLevelTitle}</h3>
            <p className="muted">Shorter labels and simpler helper text stay preferred until local-language packs clear QA.</p>
          </div>
          {READING_LEVEL_OPTIONS.map((option) => (
            <label className="r3-radio-row" key={option.value}>
              <input
                checked={readingLevelBand === option.value}
                name="readingLevelBand"
                onChange={() => setReadingLevelBand(option.value)}
                type="radio"
              />
              <span>{option.value === "plain" ? messages.readingLevelPlain : messages.readingLevelStandard}</span>
            </label>
          ))}
          {localeProfile?.fallbackNotice ? (
            <>
              <div className="r3-settings-divider" />
              <div className="stack-sm">
                <h3>{messages.localeFallbackTitle}</h3>
                <p className="muted">{localeProfile.fallbackNotice}</p>
              </div>
            </>
          ) : null}
          <div className="r3-settings-divider" />
          <div className="stack-sm">
            <h3>{messages.comingSoonTitle}</h3>
            <p className="muted">{messages.comingSoonBody}</p>
          </div>
          <ul className="pub-auth-list">
            {plannedLocales.map((option) => (
              <li key={option.code}>
                <strong>{option.displayName}</strong>: {option.description}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="r3-settings-section" aria-label="Region and location">
        <h2>Language and region</h2>
        <div className="r3-settings-card">
          <label className="field">
            <span>{messages.regionLabel}</span>
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">{messages.regionPrompt}</option>
              {regionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>City/Town</span>
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <div className="r3-form-actions">
            <button className="button-ghost" onClick={handleUseCurrentLocation} type="button">
              Use current location
            </button>
            <button className="button-secondary" onClick={() => void handleSave()} type="button">
              Update Location
            </button>
          </div>
        </div>
      </section>

      <section className="r3-settings-section" aria-label="Display">
        <h2>Advanced preferences</h2>
        <div className="r3-settings-card">
          <label className="field">
            <span>Currency display</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyFormat)}>
              <option value="GHS">GHS</option>
              <option value="NGN">NGN</option>
              <option value="JMD">JMD</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <ToggleRow checked={shareProfile} label="Share my profile with marketplace participants" onChange={setShareProfile} />
          <ToggleRow checked={analyticsOptOut} label="Opt out of analytics" onChange={setAnalyticsOptOut} />
        </div>
      </section>

      <section className="r3-settings-section" aria-label="Security">
        <h2>Account protection</h2>
        <div className="r3-settings-card">
          <SettingsLink href="/app/profile" label="Change Password" />
          <SettingsLink href="/app/profile" label="Two-Factor Authentication (2FA)" />
        </div>
      </section>

      <section className="r3-settings-section" aria-label="Data and privacy">
        <h2>Data and privacy</h2>
        <div className="r3-settings-card">
          <button className="r3-settings-link" onClick={() => setMessage("We'll prepare your data and send it to your email within 24 hours.")} type="button">
            <span>Export My Data</span>
            <span>&rsaquo;</span>
          </button>
          <button
            className="r3-settings-link danger"
            onClick={() => setMessage("Account closure requests are handled by our support team. Contact support and we will guide you through the next steps.")}
            type="button"
          >
            <span>Delete Account</span>
            <span>&rsaquo;</span>
          </button>
        </div>
      </section>

      <section className="r3-settings-section" aria-label="About">
        <h2>Help and policies</h2>
        <div className="r3-settings-card">
          <SettingsLink href="/contact" label="Help Centre" />
          <SettingsLink href="/contact" label="Contact Support" />
          <SettingsLink href="/about" label="Terms of Service" />
          <SettingsLink href="/about" label="Privacy Policy" />
          <p className="r3-version-note">App Version: 1.2.0</p>
        </div>
      </section>
    </div>
  );
}

function ToggleRow(props: {
  checked: boolean;
  detail?: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="r3-toggle-row">
      <span>
        <strong>{props.label}</strong>
        {props.detail ? <small>{props.detail}</small> : null}
      </span>
      <button
        aria-checked={props.checked}
        className={`r3-toggle ${props.checked ? "is-on" : ""}`}
        onClick={() => props.onChange(!props.checked)}
        role="switch"
        type="button"
      >
        <span />
      </button>
    </label>
  );
}

function SettingsLink(props: { href: string; label: string }) {
  return (
    <Link className="r3-settings-link" href={props.href}>
      <span>{props.label}</span>
      <span>&rsaquo;</span>
    </Link>
  );
}

function SurfaceHeader(props: { title: string; backHref: string }) {
  return (
    <div className="r3-surface-header">
      <Link className="button-ghost" href={props.backHref}>
        &larr;
      </Link>
      <h1>{props.title}</h1>
      <div />
    </div>
  );
}
