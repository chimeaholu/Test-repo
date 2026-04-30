"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/app-provider";
import {
  EmptyState,
  InfoList,
  SectionHeading,
  StatusPill,
  SurfaceCard,
} from "@/components/ui-primitives";
import { agroIntelligenceApi } from "@/lib/api/agro-intelligence";
import { useApiQuery } from "@/lib/hooks/use-api-query";
import { AgroIntelligenceShell } from "./agro-intelligence-shell";
import {
  buildEntityBadges,
  buildEntityReason,
  getAgroIntelligenceLanding,
  getCountryLabel,
  isDemoSession,
  isOperatorRole,
} from "./model";

export function AgroIntelligenceOverviewPage() {
  const router = useRouter();
  const { session, traceId } = useAppState();
  const [draftCommodity, setDraftCommodity] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftBuyerType, setDraftBuyerType] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const overviewQuery = useApiQuery(
    () => agroIntelligenceApi.getOverview(traceId),
    [traceId],
  );

  if (!session) {
    return null;
  }

  const isOperator = isOperatorRole(session.actor.role);
  const landing = getAgroIntelligenceLanding(session);
  const isDemo = isDemoSession(session);
  const overview = overviewQuery.data;

  const startHereCards = [
    {
      body: "Search by commodity, region, and trust level, then save the buyer profiles worth comparing.",
      cta: "Open buyer directory",
      href: "/app/agro-intelligence/buyers",
      title: "Buyer-ready matches",
    },
    {
      body: "Start from a strong buyer or processor record and follow the nearby partner connections that matter next.",
      cta: "Explore partner network",
      href: overview?.top_buyers[0]
        ? `/app/agro-intelligence/graph/${overview.top_buyers[0].entity_id}`
        : "/app/agro-intelligence/buyers",
      title: "Strongest verified records",
    },
    ...(isOperator
      ? [
          {
            body: "Review the records still waiting on operator judgment before they appear more confidently in customer search.",
            cta: "Open review workspace",
            href: "/app/agro-intelligence/workspace",
            title: "Where coverage is growing",
          },
        ]
      : []),
  ];

  return (
    <AgroIntelligenceShell
      description="Search for trusted buyers, processors, and partners, then move into the records most worth acting on."
      title="Find stronger commercial matches across the agriculture network"
      queueCount={overview?.verification_queue_count}
    >
      {overviewQuery.error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {overviewQuery.error.message}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="agro-overview-surface">
        <div className="agro-overview-hero-grid">
          <div className="stack-md">
            <div className="pill-row">
              <StatusPill tone="neutral">{getCountryLabel(session.actor.country_code)} coverage</StatusPill>
              <StatusPill tone={isDemo ? "degraded" : "online"}>
                {isDemo ? "Demo data" : "Live workspace"}
              </StatusPill>
            </div>
            <SectionHeading
              eyebrow="Best places to start"
              title={landing.title}
              body={landing.body}
              actions={
                <div className="inline-actions">
                  <Button href={landing.primaryAction.href} size="md" variant={landing.primaryAction.tone}>
                    {landing.primaryAction.label}
                  </Button>
                  <Button href={landing.secondaryAction.href} size="md" variant={landing.secondaryAction.tone}>
                    {landing.secondaryAction.label}
                  </Button>
                </div>
              }
            />

            <form
              className="agro-search-strip"
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (draftCommodity.trim()) {
                  params.set("commodity", draftCommodity.trim());
                }
                if (draftLocation.trim()) {
                  params.set("location", draftLocation.trim());
                }
                if (draftBuyerType.trim()) {
                  params.set("buyerType", draftBuyerType.trim());
                }
                router.push(`/app/agro-intelligence/buyers${params.size ? `?${params.toString()}` : ""}`);
              }}
            >
              <input
                className="ds-input"
                onChange={(event) => setDraftCommodity(event.target.value)}
                placeholder="Commodity"
                value={draftCommodity}
              />
              <input
                className="ds-input"
                onChange={(event) => setDraftLocation(event.target.value)}
                placeholder="Region"
                value={draftLocation}
              />
              <select
                className="ds-input ds-select"
                onChange={(event) => setDraftBuyerType(event.target.value)}
                value={draftBuyerType}
              >
                <option value="">Buyer type</option>
                <option value="buyer">Direct buyer</option>
                <option value="processor">Processor</option>
                <option value="trader">Trader</option>
                <option value="offtaker">Exporter or offtaker</option>
              </select>
              <Button size="md" type="submit" variant="primary">
                Open buyer directory
              </Button>
            </form>
          </div>

          <div className="agro-overview-side-stack">
            <SurfaceCard className="agro-mini-card">
              <SectionHeading
                eyebrow="How trust is shown"
                title="Short, plain-language trust signals"
                body="Results rise when they have stronger source checks, fresher coverage, and enough detail to support a real commercial next step."
              />
            </SurfaceCard>
            <SurfaceCard className="agro-mini-card">
              <SectionHeading
                eyebrow="Current coverage"
                title="Know where the network is already useful"
                body="Coverage keeps expanding by region and partner type, so this page shows where the strongest match quality already exists."
              />
            </SurfaceCard>
          </div>
        </div>
      </SurfaceCard>

      <div className="agro-start-grid">
        {startHereCards.map((card) => (
          <Link className="agro-start-card" href={card.href} key={card.title}>
            <span className="eyebrow">{card.cta}</span>
            <strong>{card.title}</strong>
            <p className="muted">{card.body}</p>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Current coverage"
            title="Where to start from today's network"
            body="Use this summary to see how much of the network is already buyer-ready, how much is still expanding, and where more verification work is happening."
          />
          {overview ? (
            <InfoList
              items={[
                { label: "Partner records", value: overview.entity_count },
                { label: "Buyer directory", value: overview.buyer_directory_count },
                { label: "Needs operator review", value: overview.verification_queue_count },
                { label: "Recently checked", value: overview.freshness_counts.fresh ?? 0 },
              ]}
            />
          ) : (
            <p className="muted">Checking current coverage…</p>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            eyebrow="How trust is shown"
            title="Readiness across the network"
            body="Customer-facing search should lead with the strongest, freshest records while keeping thinner coverage clearly labeled."
            actions={
              isOperator ? (
                <Button
                  loading={refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    void agroIntelligenceApi
                      .runResolution(traceId)
                      .then(() => overviewQuery.refetch())
                      .finally(() => setRefreshing(false));
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Refresh records
                </Button>
              ) : null
            }
          />
          {overview ? (
            <div className="stack-md">
              <div className="pill-row">
                <StatusPill tone="online">Trusted {overview.trust_counts.gold ?? 0}</StatusPill>
                <StatusPill tone="neutral">Verified {overview.trust_counts.silver ?? 0}</StatusPill>
                <StatusPill tone="degraded">
                  Limited verification {overview.trust_counts.bronze ?? 0}
                </StatusPill>
              </div>
              <div className="pill-row">
                <StatusPill tone="online">Recently checked {overview.freshness_counts.fresh ?? 0}</StatusPill>
                <StatusPill tone="neutral">Review soon {overview.freshness_counts.watch ?? 0}</StatusPill>
                <StatusPill tone="degraded">Needs refresh {overview.freshness_counts.stale ?? 0}</StatusPill>
                <StatusPill tone="offline">Expired {overview.freshness_counts.expired ?? 0}</StatusPill>
              </div>
            </div>
          ) : (
            <p className="muted">Checking readiness across the network…</p>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Best places to start"
          title="Start with the strongest buyer-ready records"
          body="These profiles are the fastest way into credible buyer review, shortlist building, and partner comparison."
        />

        {overview && overview.top_buyers.length > 0 ? (
          <div className="agro-buyer-card-grid">
            {overview.top_buyers.map((buyer) => {
              const badges = buildEntityBadges(buyer, { isDemo });
              return (
                <article className="agro-buyer-card" key={buyer.entity_id}>
                  <div className="stack-sm">
                    <div className="pill-row">
                      {badges.map((badge) => (
                        <StatusPill key={`${buyer.entity_id}-${badge.label}`} tone={badge.tone}>
                          {badge.label}
                        </StatusPill>
                      ))}
                    </div>
                    <div className="stack-sm">
                      <strong className="agro-card-title">{buyer.canonical_name}</strong>
                      <span className="muted">
                        {buyer.location_signature || "Location pending"} · {buyer.operator_tags.join(", ") || "buyer"}
                      </span>
                    </div>
                    <p className="muted">{buildEntityReason(buyer, session.actor.role)}</p>
                  </div>
                  <div className="agro-card-meta">
                    <span>{buyer.commodity_tags.join(", ") || "Commodity tags pending"}</span>
                    <span>
                      {buyer.source_document_count} verification source
                      {buyer.source_document_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="inline-actions">
                    <Button href={`/app/agro-intelligence/buyers/${buyer.entity_id}`} size="sm" variant="primary">
                      Open profile
                    </Button>
                    <Button href={`/app/agro-intelligence/graph/${buyer.entity_id}`} size="sm" variant="ghost">
                      Explore partner network
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No buyer-ready matches yet"
            body="As more partner records pass verification, the strongest buyer and processor matches will appear here first."
            actions={
              isOperator ? (
                <Button
                  loading={refreshing}
                  onClick={() => {
                    setRefreshing(true);
                    void agroIntelligenceApi
                      .runResolution(traceId)
                      .then(() => overviewQuery.refetch())
                      .finally(() => setRefreshing(false));
                  }}
                  size="md"
                  variant="primary"
                >
                  Refresh records
                </Button>
              ) : null
            }
          />
        )}
      </SurfaceCard>
    </AgroIntelligenceShell>
  );
}
