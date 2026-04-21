import type { ActorRole, Channel } from "@agrodomain/contracts";

type ConnectivityState = "online" | "offline" | "degraded";

const supportedChannelsByCountry: Record<string, string[]> = {
  GH: ["pwa", "ussd", "whatsapp", "sms"],
  NG: ["pwa", "ussd", "whatsapp", "sms"],
  JM: ["pwa", "whatsapp", "sms"],
};

const featureFlags = {
  "workflow.offline_backend_replay": {
    actorRoles: ["farmer", "buyer", "cooperative", "advisor", "finance", "admin"],
    channels: ["pwa"],
    countries: ["GH", "NG", "JM"],
  },
} as const;

export function deriveHandoffChannel(input: {
  connectivityState: ConnectivityState;
  countryCode: string;
  environment: string;
}): "whatsapp" | "ussd" | "sms" | null {
  const countryCode = input.countryCode.toUpperCase();
  const channels = supportedChannelsByCountry[countryCode] ?? ["pwa", "sms"];
  if (input.connectivityState === "online") {
    return null;
  }
  if (input.connectivityState === "degraded") {
    return channels.includes("ussd") ? "ussd" : channels.includes("sms") ? "sms" : null;
  }
  return channels.includes("whatsapp")
    ? "whatsapp"
    : channels.includes("sms")
      ? "sms"
      : channels.includes("ussd")
        ? "ussd"
        : null;
}

export function resolveFeatureGate(input: {
  actorRole: string;
  channel: string;
  countryCode: string;
  environment: string;
  flagKey: keyof typeof featureFlags;
}): { enabled: boolean; reason: string; policy: null } {
  const flag = featureFlags[input.flagKey];
  const countryCode = input.countryCode.toUpperCase() as (typeof flag.countries)[number];
  const channel = input.channel as (typeof flag.channels)[number];
  const actorRole = input.actorRole as ActorRole;
  if (!flag) {
    return { enabled: false, reason: "flag_not_found", policy: null };
  }
  if (!flag.countries.includes(countryCode)) {
    return { enabled: false, reason: "country_not_allowed", policy: null };
  }
  if (!flag.channels.includes(channel)) {
    return { enabled: false, reason: "channel_not_allowed", policy: null };
  }
  if (!flag.actorRoles.includes(actorRole)) {
    return { enabled: false, reason: "actor_role_not_allowed", policy: null };
  }
  return { enabled: true, reason: "flag_enabled", policy: null };
}
