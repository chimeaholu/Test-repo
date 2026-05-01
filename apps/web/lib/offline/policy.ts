"use client";

import type { ConnectivityState, OfflineQueueItem } from "@agrodomain/contracts";

export interface OfflineReadModelPolicy {
  key: string;
  label: string;
  module: string;
  pathPattern: RegExp;
  ttlMs: number;
}

export interface OfflineMutationPolicy {
  commandName: string;
  mode: "queueable" | "online-only";
  blockedMessage: string;
}

export interface OfflineBoundarySection {
  module: string;
  offlineReads: string[];
  deferredMutations: string[];
  onlineOnly: string[];
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export const offlineReadModelPolicies: OfflineReadModelPolicy[] = [
  {
    key: "marketplace-listings",
    label: "Marketplace listings",
    module: "Marketplace",
    pathPattern: /^\/api\/v1\/marketplace\/listings(?:\?.*)?$/u,
    ttlMs: FIFTEEN_MINUTES_MS,
  },
  {
    key: "marketplace-listing-detail",
    label: "Listing detail",
    module: "Marketplace",
    pathPattern: /^\/api\/v1\/marketplace\/listings\/[^/]+$/u,
    ttlMs: THIRTY_MINUTES_MS,
  },
  {
    key: "marketplace-negotiations",
    label: "Negotiation inbox",
    module: "Marketplace",
    pathPattern: /^\/api\/v1\/marketplace\/negotiations(?:\?.*)?$/u,
    ttlMs: FIFTEEN_MINUTES_MS,
  },
  {
    key: "wallet-summary",
    label: "Wallet summary",
    module: "Finance",
    pathPattern: /^\/api\/v1\/wallet\/summary(?:\?.*)?$/u,
    ttlMs: FIFTEEN_MINUTES_MS,
  },
  {
    key: "wallet-escrows",
    label: "Escrow queue",
    module: "Finance",
    pathPattern: /^\/api\/v1\/wallet\/escrows(?:\/[^/]+)?(?:\?.*)?$/u,
    ttlMs: FIFTEEN_MINUTES_MS,
  },
  {
    key: "identity-actor-search",
    label: "Buyer and actor search",
    module: "Discovery",
    pathPattern: /^\/api\/v1\/identity\/actors\/search(?:\?.*)?$/u,
    ttlMs: FIFTEEN_MINUTES_MS,
  },
];

const offlineMutationPolicyMap = new Map<string, OfflineMutationPolicy>([
  [
    "market.listings.create",
    {
      commandName: "market.listings.create",
      mode: "queueable",
      blockedMessage:
        "Listing drafts can be saved offline and synced later.",
    },
  ],
  [
    "market.listings.update",
    {
      commandName: "market.listings.update",
      mode: "queueable",
      blockedMessage:
        "Listing draft edits can be saved offline and synced later.",
    },
  ],
  [
    "market.listings.publish",
    {
      commandName: "market.listings.publish",
      mode: "online-only",
      blockedMessage:
        "Publishing requires a live connection because buyers must see the confirmed server version.",
    },
  ],
  [
    "market.listings.unpublish",
    {
      commandName: "market.listings.unpublish",
      mode: "online-only",
      blockedMessage:
        "Closing a live listing requires a live connection because the server must confirm buyer visibility immediately.",
    },
  ],
]);

export const offlineBoundarySections: OfflineBoundarySection[] = [
  {
    module: "App shell and role home",
    offlineReads: [
      "App shell and role navigation",
      "Recent marketplace, finance, and negotiation summaries",
      "Cached role-home and notification counts",
    ],
    deferredMutations: [
      "None in the shell itself",
    ],
    onlineOnly: [
      "Fresh session creation and server-backed consent changes",
    ],
  },
  {
    module: "Marketplace drafts",
    offlineReads: [
      "Listing index",
      "Listing detail",
      "Negotiation inbox snapshots",
    ],
    deferredMutations: [
      "Create draft listing",
      "Update draft listing metadata",
    ],
    onlineOnly: [
      "Publish listing",
      "Close listing",
      "Live negotiation commits",
    ],
  },
  {
    module: "Finance and protected actions",
    offlineReads: [
      "Cached wallet and escrow summaries",
    ],
    deferredMutations: [
      "None in EH1B",
    ],
    onlineOnly: [
      "Wallet transfers",
      "Escrow release",
      "Provider-backed refreshes",
    ],
  },
];

export function matchOfflineReadModelPolicy(path: string): OfflineReadModelPolicy | null {
  return (
    offlineReadModelPolicies.find((policy) => policy.pathPattern.test(path)) ??
    null
  );
}

export function getOfflineMutationPolicy(commandName: string): OfflineMutationPolicy {
  return (
    offlineMutationPolicyMap.get(commandName) ?? {
      commandName,
      mode: "online-only",
      blockedMessage:
        "This action needs a live connection because the server must confirm it immediately.",
    }
  );
}

export function handoffChannelForConnectivity(
  connectivityState: ConnectivityState,
): "whatsapp" | "ussd" | "sms" | null {
  if (connectivityState === "offline") {
    return "whatsapp";
  }

  if (connectivityState === "degraded") {
    return "ussd";
  }

  return null;
}

export function queueStateLabel(item: OfflineQueueItem): string {
  switch (item.state) {
    case "queued":
      return "Saved offline";
    case "replaying":
      return "Syncing";
    case "acked":
      return "Synced";
    case "failed_retryable":
      return "Waiting to sync";
    case "failed_terminal":
      return "Needs review";
    case "cancelled":
      return "Dismissed";
    case "conflicted":
      return "Needs review";
    default:
      return item.state;
  }
}

export function queueItemSummary(item: OfflineQueueItem): string {
  const payload = item.envelope.command.payload.payload;
  const crop = typeof payload.crop === "string" ? payload.crop : null;
  const title = typeof payload.title === "string" ? payload.title : null;
  const quantityTons =
    typeof payload.quantity_tons === "number" ? payload.quantity_tons : null;

  switch (item.intent) {
    case "market.listings.create":
      return [
        "Draft listing",
        title ?? crop,
        quantityTons !== null ? `${quantityTons}t` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "market.listings.update":
      return [
        "Draft update",
        title ?? crop,
        item.workflow_id,
      ]
        .filter(Boolean)
        .join(" · ");
    default:
      return `${item.intent} · ${item.workflow_id}`;
  }
}
