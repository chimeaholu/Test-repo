"use client";

import type {
  ListingRecord,
  NegotiationThreadRead,
} from "@agrodomain/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardActionTile } from "@/components/dashboard-action-tile";
import { useAppState } from "@/components/app-provider";
import {
  ActionLink,
  EmptyState,
  InsightCallout,
  SectionHeading,
  StatusPill,
  SurfaceCard,
} from "@/components/ui-primitives";
import {
  AdvisoryIcon,
  BellIcon,
  CropIcon,
  MarketIcon,
  NotificationIcon,
  SunIcon,
  WalletIcon,
} from "@/components/icons";
import { advisoryApi } from "@/lib/api/advisory";
import { climateApi } from "@/lib/api/climate";
import { marketplaceApi } from "@/lib/api/marketplace";
import type { ClimateAlert, ClimateDegradedMode } from "@/lib/api-types";
import { walletApi } from "@/lib/api/wallet";
import { formatMoney } from "@/features/wallet/model";
import { queueSummary } from "@/lib/offline/reducer";

type AdvisoryConversation = Awaited<ReturnType<typeof advisoryApi.listConversations>>["data"]["items"][number];
type WalletSummary = Awaited<ReturnType<typeof walletApi.getWalletSummary>>["data"];

type ActivityItem = {
  detail: string;
  href: string;
  icon: "listing" | "negotiation" | "wallet" | "weather" | "guide";
  id: string;
  linkLabel: string;
  timestamp: string;
  title: string;
};

type DashboardErrors = Partial<
  Record<"advisory" | "climate" | "listings" | "negotiations" | "wallet", string>
>;

type DashboardState = {
  advisory: AdvisoryConversation[];
  climateAlerts: ClimateAlert[];
  degradedModes: ClimateDegradedMode[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
  wallet: WalletSummary | null;
};

const initialState: DashboardState = {
  advisory: [],
  climateAlerts: [],
  degradedModes: [],
  listings: [],
  negotiations: [],
  wallet: null,
};

const activityIconMap = {
  guide: AdvisoryIcon,
  listing: CropIcon,
  negotiation: NotificationIcon,
  wallet: WalletIcon,
  weather: SunIcon,
} as const;

function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function formatRelativeTime(timestamp: string): string {
  const diffMs = new Date(timestamp).getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, size] of units) {
    if (absMs >= size || unit === "minute") {
      const value = Math.round(diffMs / size);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit);
    }
  }

  return "just now";
}

function countryLabel(countryCode: string): string {
  return {
    GH: "Ghana",
    JM: "Jamaica",
    NG: "Nigeria",
  }[countryCode] ?? countryCode;
}

function severityTone(
  severity: string,
): "degraded" | "neutral" | "offline" | "online" {
  if (severity === "critical") {
    return "offline";
  }
  if (severity === "warning") {
    return "degraded";
  }
  return "neutral";
}

function listingStatusTone(
  listing: ListingRecord,
): "degraded" | "neutral" | "offline" | "online" {
  if (listing.status === "published") {
    return "online";
  }
  if (listing.status === "draft") {
    return "degraded";
  }
  return "neutral";
}

function buildActivityFeed(input: {
  actorId: string;
  advisory: AdvisoryConversation[];
  climateAlerts: ClimateAlert[];
  listings: ListingRecord[];
  negotiations: NegotiationThreadRead[];
  walletUpdatedAt: string | null | undefined;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const listing of input.listings.slice(0, 4)) {
    items.push({
      detail:
        listing.status === "published"
          ? "Your listing is visible to buyers and ready for new offers."
          : "Finish the latest edits before you publish this listing to the marketplace.",
      href: `/app/market/listings/${listing.listing_id}`,
      icon: "listing",
      id: `listing-${listing.listing_id}`,
      linkLabel: "Open listing",
      timestamp: listing.updated_at,
      title: `${listing.title} is ${listing.status}`,
    });
  }

  for (const thread of input.negotiations.slice(0, 4)) {
    const lastMessage = thread.messages.at(-1);
    const counterpartyId =
      thread.seller_actor_id === input.actorId ? thread.buyer_actor_id : thread.seller_actor_id;
    items.push({
      detail: lastMessage?.note ?? `Counterparty ${counterpartyId} updated the offer on this thread.`,
      href: `/app/market/negotiations?threadId=${thread.thread_id}`,
      icon: "negotiation",
      id: `negotiation-${thread.thread_id}`,
      linkLabel: "Review negotiation",
      timestamp: thread.updated_at,
      title: `Negotiation ${thread.status.replace("_", " ")}`,
    });
  }

  for (const alert of input.climateAlerts.slice(0, 3)) {
    items.push({
      detail: alert.summary,
      href: "/app/weather",
      icon: "weather",
      id: `alert-${alert.alert_id}`,
      linkLabel: "View climate alerts",
      timestamp: alert.created_at,
      title: alert.title,
    });
  }

  for (const conversation of input.advisory.slice(0, 3)) {
    items.push({
      detail: conversation.response_text,
      href: "/app/advisory/new",
      icon: "guide",
      id: `advisory-${conversation.advisory_request_id}`,
      linkLabel: "Open AgroGuide",
      timestamp: conversation.created_at,
      title: conversation.topic,
    });
  }

  if (input.walletUpdatedAt) {
    items.push({
      detail: "Your wallet balance and escrow posture were refreshed from the live records.",
      href: "/app/payments/wallet",
      icon: "wallet",
      id: "wallet-summary",
      linkLabel: "View wallet",
      timestamp: input.walletUpdatedAt,
      title: "Wallet summary updated",
    });
  }

  return items
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 10);
}

export function FarmerDashboard() {
  const { queue, session, traceId } = useAppState();
  const [data, setData] = useState<DashboardState>(initialState);
  const [errors, setErrors] = useState<DashboardErrors>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || session.actor.role !== "farmer") {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.allSettled([
      marketplaceApi.listListings(traceId),
      marketplaceApi.listNegotiations(traceId),
      walletApi.getWalletSummary(traceId),
      climateApi.listRuntime(traceId, session.actor.locale),
      advisoryApi.listConversations(traceId, session.actor.locale),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const nextState: DashboardState = { ...initialState };
        const nextErrors: DashboardErrors = {};

        const listingsResult = results[0];
        if (listingsResult.status === "fulfilled") {
          nextState.listings = listingsResult.value.data.items.filter(
            (item) => item.actor_id === session.actor.actor_id && item.status !== "closed",
          );
        } else {
          nextErrors.listings = "Unable to load your listings right now.";
        }

        const negotiationsResult = results[1];
        if (negotiationsResult.status === "fulfilled") {
          nextState.negotiations = negotiationsResult.value.data.items.filter(
            (item) => item.seller_actor_id === session.actor.actor_id,
          );
        } else {
          nextErrors.negotiations = "Unable to load your negotiations right now.";
        }

        const walletResult = results[2];
        if (walletResult.status === "fulfilled") {
          nextState.wallet = walletResult.value.data;
        } else {
          nextErrors.wallet = "Unable to load your wallet summary right now.";
        }

        const climateResult = results[3];
        if (climateResult.status === "fulfilled") {
          nextState.climateAlerts = climateResult.value.data.alerts;
          nextState.degradedModes = climateResult.value.data.degraded_modes;
        } else {
          nextErrors.climate = "Unable to load the field weather outlook right now.";
        }

        const advisoryResult = results[4];
        if (advisoryResult.status === "fulfilled") {
          nextState.advisory = advisoryResult.value.data.items;
        } else {
          nextErrors.advisory = "Unable to load the AgroGuide tip right now.";
        }

        setData(nextState);
        setErrors(nextErrors);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, traceId]);

  if (!session || session.actor.role !== "farmer") {
    return null;
  }

  const queueState = queueSummary(queue.items);
  const pendingNegotiations = data.negotiations.filter(
    (thread) => thread.status === "open" || thread.status === "pending_confirmation",
  );
  const activeListings = data.listings.filter((listing) => listing.status === "published");
  const topListingCards = data.listings.slice(0, 3);
  const advisoryTip = data.advisory[0] ?? null;
  const primaryAlert = data.climateAlerts[0] ?? null;
  const activity = buildActivityFeed({
    actorId: session.actor.actor_id,
    advisory: data.advisory,
    climateAlerts: data.climateAlerts,
    listings: data.listings,
    negotiations: data.negotiations,
    walletUpdatedAt: data.wallet?.updated_at,
  });
  const heroLocation = `${session.actor.membership.organization_name} · ${countryLabel(
    session.actor.country_code,
  )}`;

  return (
    <div className="content-stack">
      <SurfaceCard className="farmer-hero-card">
        <SectionHeading
          eyebrow="Farmer workspace"
          title={`${getGreeting()}, ${session.actor.display_name}. Keep the next field move clear.`}
          body="Check what needs attention, move produce into the market, and keep weather and payment updates close by."
          actions={
            <div className="pill-row">
              <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "degraded"}>
                {session.consent.state === "consent_granted" ? "Ready" : "Needs attention"}
              </StatusPill>
              <StatusPill tone={queue.connectivity_state === "online" ? "online" : queue.connectivity_state}>
                {queue.connectivity_state === "degraded" ? "Limited updates" : queue.connectivity_state}
              </StatusPill>
            </div>
          }
        />
        <div className="farmer-hero-meta">
          <div className="stack-sm">
            <strong>{heroLocation}</strong>
            <p className="muted">
              {primaryAlert
                ? `${data.climateAlerts.length} active field alerts. Highest urgency: ${primaryAlert.title}.`
                : "No field alerts are blocking today's farm work."}
            </p>
          </div>
          <div className="actions-row">
            <ActionLink href="/app/market/listings" label="Create listing" />
            <ActionLink href="/app/weather" label="Check weather" tone="secondary" />
          </div>
        </div>
      </SurfaceCard>

      <div className="farmer-kpi-grid">
        <article className="metric-card">
          <span className="metric-label">Active listings</span>
          <strong className="metric-value">
            {errors.listings ? "..." : activeListings.length}
          </strong>
          <p className="muted">
            {errors.listings ?? "Published produce currently visible to buyers in the marketplace."}
          </p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pending negotiations</span>
          <strong className="metric-value">
            {errors.negotiations ? "..." : pendingNegotiations.length}
          </strong>
          <p className="muted">
            {errors.negotiations ?? "Offer threads that still need a reply, confirmation, or close-out decision."}
          </p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Wallet balance</span>
          <strong className="metric-value farmer-money-value">
            {data.wallet ? formatMoney(data.wallet.available_balance, data.wallet.currency) : "..."}
          </strong>
          <p className="muted">
            {errors.wallet ??
              `Held in escrow: ${
                data.wallet ? formatMoney(data.wallet.held_balance, data.wallet.currency) : "Unavailable"
              }.`}
          </p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Weather alerts</span>
          <strong className="metric-value">
            {errors.climate ? "..." : data.climateAlerts.length}
          </strong>
          <p className="muted">
            {errors.climate ?? `${data.degradedModes.length} update windows currently need extra care.`}
          </p>
        </article>
      </div>

      <div className="farmer-dashboard-layout">
        <div className="content-stack">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Quick actions"
              title="Choose the next farm task"
              body="Move into selling, payment follow-up, or support without digging through extra screens."
            />
            <div className="farmer-quick-actions">
              <DashboardActionTile
                detail="Open the market workspace and publish fresh produce supply."
                eyebrow="Do now"
                href="/app/market/listings"
                icon={<MarketIcon size={20} />}
                label="Create listing"
              />
              <DashboardActionTile
                detail="Review today's weather updates before you plan the next field move."
                eyebrow="Watch"
                href="/app/weather"
                icon={<SunIcon size={20} />}
                label="Check weather"
                tone="secondary"
              />
              <DashboardActionTile
                detail="Inspect cash on hand, money on hold, and recent payout activity."
                eyebrow="Money"
                href="/app/payments/wallet"
                icon={<WalletIcon size={20} />}
                label="View wallet"
                tone="secondary"
              />
              <DashboardActionTile
                detail="Continue practical field guidance with local support close by."
                eyebrow="Need help"
                href="/app/advisory/new"
                icon={<AdvisoryIcon size={20} />}
                label="Ask AgroGuide"
                tone="warning"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Today's field and market picture"
              title="Your current market presence"
              body="Keep the latest listing state, volume, and price picture clear before you move into offers."
              actions={
                <Link className="button-ghost farmer-inline-link" href="/app/market/listings">
                  See all listings
                </Link>
              }
            />
            {errors.listings ? (
              <EmptyState
                title="Listings are temporarily unavailable"
                body={errors.listings}
                actions={
                  <Link className="button-secondary" href="/app/market/listings">
                    Open listing workspace
                  </Link>
                }
              />
            ) : topListingCards.length === 0 ? (
              <EmptyState
                title="No listings yet"
                body="Create your first listing to start selling on AgroMarket."
                actions={
                  <Link className="button-primary" href="/app/market/listings">
                    Create listing
                  </Link>
                }
              />
            ) : (
              <div className="farmer-listings-grid">
                {topListingCards.map((listing) => (
                  <Link className="queue-item farmer-listing-card" href={`/app/market/listings/${listing.listing_id}`} key={listing.listing_id}>
                    <div className="queue-head">
                      <strong>{listing.title}</strong>
                      <StatusPill tone={listingStatusTone(listing)}>{listing.status}</StatusPill>
                    </div>
                    <p className="muted">
                      {listing.commodity} · {listing.quantity_tons} tons · {listing.location}
                    </p>
                    <p className="muted">
                      {formatMoney(listing.price_amount, listing.price_currency)} · {listing.revision_count} saved changes
                    </p>
                    <p className="muted">Updated {formatRelativeTime(listing.updated_at)}</p>
                  </Link>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Recent activity"
              title="What changed most recently"
              body="The feed blends live marketplace, wallet, climate, and advisory updates so you can act without opening every module first."
            />
            {isLoading ? (
              <p className="muted" role="status">
                Loading dashboard activity...
              </p>
            ) : activity.length === 0 ? (
              <EmptyState
                title="No recent activity yet"
                body="As you publish listings, receive offers, and review alerts, the latest events will appear here."
              />
            ) : (
              <div className="farmer-activity-feed" role="list" aria-label="Recent farmer activity">
                {activity.map((item) => {
                  const Icon = activityIconMap[item.icon];
                  return (
                    <article className="queue-item farmer-activity-card" key={item.id} role="listitem">
                      <div className="farmer-activity-icon">
                        <Icon size={18} />
                      </div>
                      <div className="stack-sm">
                        <div className="queue-head">
                          <strong>{item.title}</strong>
                          <span className="muted">{formatRelativeTime(item.timestamp)}</span>
                        </div>
                        <p className="muted">{item.detail}</p>
                        <Link className="farmer-inline-link" href={item.href}>
                          {item.linkLabel}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="content-stack">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Weather and guidance"
              title="Field outlook"
              body="Keep local warnings, next-step timing, and confidence cues close to today's work."
              actions={
                <Link className="button-ghost farmer-inline-link" href="/app/weather">
                  Open weather
                </Link>
              }
            />
            {errors.climate ? (
              <EmptyState title="Weather outlook unavailable" body={errors.climate} />
            ) : primaryAlert ? (
              <div className="stack-md">
                <div className="farmer-weather-hero">
                  <div className="stack-sm">
                    <div className="pill-row">
                      <StatusPill tone={severityTone(primaryAlert.severity)}>{primaryAlert.severity}</StatusPill>
                      <StatusPill tone={primaryAlert.acknowledged ? "online" : "degraded"}>
                        {primaryAlert.acknowledged ? "Acknowledged" : "Action needed"}
                      </StatusPill>
                    </div>
                    <strong>{primaryAlert.title}</strong>
                    <p className="muted">{primaryAlert.summary}</p>
                  </div>
                </div>
                <div className="farmer-weather-forecast">
                  {data.climateAlerts.slice(0, 3).map((alert, index) => (
                    <article className="stat-chip" key={alert.alert_id}>
                      <span className="metric-label">
                        {index === 0 ? "Now" : index === 1 ? "Next" : "Later"}
                      </span>
                      <strong>{alert.severity}</strong>
                      <span className="muted">{alert.title}</span>
                    </article>
                  ))}
                </div>
                {data.degradedModes.length > 0 ? (
                  <InsightCallout
                    title="Update confidence is reduced"
                    body={`${data.degradedModes.length} weather update windows are limited. Keep the warning posture, but verify field conditions before making transport or harvest changes.`}
                    tone="accent"
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No weather alerts at the moment"
                body="Your climate feed is connected, but there are no active field alerts to surface right now."
              />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="AgroGuide"
              title="Today’s advisory nudge"
              body="Keep one practical recommendation close to the dashboard so field action and guidance stay connected."
            />
            {errors.advisory ? (
              <EmptyState title="AgroGuide is unavailable" body={errors.advisory} />
            ) : advisoryTip ? (
              <div className="farmer-guide-card">
                <div className="pill-row">
                  <StatusPill tone={advisoryTip.status === "delivered" ? "online" : "degraded"}>
                    {advisoryTip.status.replace("_", " ")}
                  </StatusPill>
                  <StatusPill tone={advisoryTip.grounded ? "online" : "neutral"}>
                    {advisoryTip.grounded ? "Ready" : "Draft"}
                  </StatusPill>
                </div>
                <strong>{advisoryTip.topic}</strong>
                <p>{advisoryTip.response_text}</p>
                <div className="actions-row">
                  <Link className="button-secondary" href="/app/advisory/new">
                    Continue advisory
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No advisory tip ready"
                body="When AgroGuide delivers a new recommendation, it will appear here for quick pickup."
              />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Saved work"
              title="Saved work and updates"
              body="Keep unfinished work and key updates visible so you know whether to continue or tidy things up first."
            />
            <div className="stat-strip">
              <article className="stat-chip">
                <span className="metric-label">Saved actions</span>
                <strong>{queueState.actionableCount}</strong>
                <span className="muted">Work waiting to finish when you return to it.</span>
              </article>
              <article className="stat-chip">
                <span className="metric-label">Needs attention</span>
                <strong>{queueState.conflictedCount}</strong>
                <span className="muted">Items that need review before they can clear.</span>
              </article>
            </div>
            <div className="actions-row">
              <Link className="button-ghost" href="/app/offline/outbox">
                Open saved work
              </Link>
              <Link className="button-ghost" href="/app/notifications">
                <BellIcon size={16} />
                View updates
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
