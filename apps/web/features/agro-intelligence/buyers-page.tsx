"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/components/app-provider";
import {
  EmptyState,
  SectionHeading,
  StatusPill,
  SurfaceCard,
} from "@/components/ui-primitives";
import { agroIntelligenceApi } from "@/lib/api/agro-intelligence";
import { useApiQuery } from "@/lib/hooks/use-api-query";
import { AgroIntelligenceShell } from "./agro-intelligence-shell";
import {
  buildCompareFields,
  buildCoverageBuckets,
  buildEntityBadges,
  buildEntityReason,
  collectBuyerFilterOptions,
  filterBuyerEntities,
  isDemoSession,
  readShortlist,
  toggleShortlistItem,
  writeShortlist,
  type BuyerDirectoryFilters,
  type BuyerDirectoryView,
} from "./model";

const DEFAULT_FILTERS: BuyerDirectoryFilters = {
  buyerType: "",
  commodity: "",
  freshness: "",
  location: "",
  query: "",
  trustTier: "",
};

function compareFieldValue(value: string): string {
  return value || "Not available yet";
}

export function AgroIntelligenceBuyersPage() {
  const searchParams = useSearchParams();
  const { session, traceId } = useAppState();
  const [view, setView] = useState<BuyerDirectoryView>("cards");
  const [filters, setFilters] = useState<BuyerDirectoryFilters>(DEFAULT_FILTERS);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const buyersQuery = useApiQuery(
    () => agroIntelligenceApi.listBuyers(traceId),
    [traceId],
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    setShortlist(readShortlist(session.actor.country_code));
  }, [session]);

  useEffect(() => {
    setFilters({
      buyerType: searchParams.get("buyerType") ?? "",
      commodity: searchParams.get("commodity") ?? "",
      freshness: searchParams.get("freshness") ?? "",
      location: searchParams.get("location") ?? "",
      query: searchParams.get("q") ?? "",
      trustTier: searchParams.get("trustTier") ?? "",
    });
  }, [searchParams]);

  if (!session) {
    return null;
  }

  const isDemo = isDemoSession(session);
  const allBuyers = buyersQuery.data?.items ?? [];
  const deferredFilters = useDeferredValue(filters);
  const filteredBuyers = filterBuyerEntities(allBuyers, deferredFilters, session.actor.role);
  const filterOptions = collectBuyerFilterOptions(allBuyers);
  const coverage = buildCoverageBuckets(filteredBuyers);
  const shortlistedBuyers = filteredBuyers.filter((buyer) => shortlist.includes(buyer.entity_id));

  const toggleBuyer = (entityId: string) => {
    const next = toggleShortlistItem(shortlist, entityId);
    setShortlist(next);
    writeShortlist(session.actor.country_code, next);
  };

  return (
    <AgroIntelligenceShell
      description="Search by commodity, region, and trust level, then save the buyers you want to compare."
      title="Filter credible buyers and keep the strongest matches close"
      queueCount={0}
    >
      <SurfaceCard>
        <SectionHeading
          eyebrow="Buyer directory"
          title="Filter credible buyers and keep the strongest matches close"
          body="Search by commodity, region, trust level, and buyer type, then save the profiles you want to compare."
          actions={
            <div className="pill-row">
              <StatusPill tone="neutral">{filteredBuyers.length} matching buyers</StatusPill>
              <StatusPill tone="online">
                Trusted {filteredBuyers.filter((buyer) => buyer.trust_tier === "gold").length}
              </StatusPill>
              <StatusPill tone="degraded">Shortlist {shortlist.length}</StatusPill>
            </div>
          }
        />

        <div className="agro-directory-filter-grid">
          <label className="agro-filter-field">
            <span>Search</span>
            <input
              className="ds-input"
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Buyer, processor, region, or commodity"
              value={filters.query}
            />
          </label>
          <label className="agro-filter-field">
            <span>Commodity</span>
            <select
              className="ds-input ds-select"
              onChange={(event) => setFilters((current) => ({ ...current, commodity: event.target.value }))}
              value={filters.commodity}
            >
              <option value="">All commodities</option>
              {filterOptions.commodities.map((commodity) => (
                <option key={commodity} value={commodity}>
                  {commodity}
                </option>
              ))}
            </select>
          </label>
          <label className="agro-filter-field">
            <span>Region</span>
            <select
              className="ds-input ds-select"
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              value={filters.location}
            >
              <option value="">All regions</option>
              {filterOptions.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label className="agro-filter-field">
            <span>Buyer type</span>
            <select
              className="ds-input ds-select"
              onChange={(event) => setFilters((current) => ({ ...current, buyerType: event.target.value }))}
              value={filters.buyerType}
            >
              <option value="">All buyer types</option>
              {filterOptions.buyerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="agro-filter-field">
            <span>Trust level</span>
            <select
              className="ds-input ds-select"
              onChange={(event) => setFilters((current) => ({ ...current, trustTier: event.target.value }))}
              value={filters.trustTier}
            >
              <option value="">Any trust level</option>
              <option value="gold">Trusted</option>
              <option value="silver">Verified</option>
              <option value="bronze">Limited verification</option>
            </select>
          </label>
          <label className="agro-filter-field">
            <span>Freshness</span>
            <select
              className="ds-input ds-select"
              onChange={(event) => setFilters((current) => ({ ...current, freshness: event.target.value }))}
              value={filters.freshness}
            >
              <option value="">Any freshness</option>
              <option value="fresh">Fresh</option>
              <option value="watch">Review soon</option>
              <option value="stale">Needs refresh</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>

        <div className="agro-directory-toolbar">
          <div className="pill-row">
            <button
              aria-pressed={view === "cards"}
              className={view === "cards" ? "button-primary" : "button-ghost"}
              onClick={() => setView("cards")}
              type="button"
            >
              Cards
            </button>
            <button
              aria-pressed={view === "coverage"}
              className={view === "coverage" ? "button-primary" : "button-ghost"}
              onClick={() => setView("coverage")}
              type="button"
            >
              Coverage
            </button>
            <button
              aria-pressed={view === "compare"}
              className={view === "compare" ? "button-primary" : "button-ghost"}
              onClick={() => setView("compare")}
              type="button"
            >
              Compare
            </button>
          </div>
          <Button
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setView("cards");
            }}
            size="sm"
            variant="ghost"
          >
            Clear filters
          </Button>
        </div>
      </SurfaceCard>

      {buyersQuery.error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {buyersQuery.error.message}
          </p>
        </SurfaceCard>
      ) : null}

      {view === "cards" ? (
        <section className="agro-buyer-card-grid" aria-label="Buyer directory results">
          {filteredBuyers.length > 0 ? (
            filteredBuyers.map((buyer) => {
              const badges = buildEntityBadges(buyer, { isDemo });
              const shortlisted = shortlist.includes(buyer.entity_id);
              return (
                <article className="agro-buyer-card" key={buyer.entity_id}>
                  <div className="stack-md">
                    <div className="agro-card-head">
                      <div className="stack-sm">
                        <strong className="agro-card-title">{buyer.canonical_name}</strong>
                        <span className="muted">
                          {buyer.location_signature || "Location pending"} · {buyer.operator_tags.join(", ") || "buyer"}
                        </span>
                      </div>
                      <button
                        className={shortlisted ? "button-secondary" : "button-ghost"}
                        onClick={() => toggleBuyer(buyer.entity_id)}
                        type="button"
                      >
                        {shortlisted ? "Saved" : "Save to shortlist"}
                      </button>
                    </div>

                    <div className="pill-row">
                      {badges.map((badge) => (
                        <StatusPill key={`${buyer.entity_id}-${badge.label}`} tone={badge.tone}>
                          {badge.label}
                        </StatusPill>
                      ))}
                    </div>

                    <p className="muted">{buildEntityReason(buyer, session.actor.role)}</p>

                    <div className="agro-card-meta">
                      <span>{buyer.commodity_tags.join(", ") || "Commodity tags pending"}</span>
                      <span>
                        {buyer.source_document_count} verification source
                        {buyer.source_document_count === 1 ? "" : "s"}
                      </span>
                      <span>{buyer.pending_claim_count} follow-up item{buyer.pending_claim_count === 1 ? "" : "s"}</span>
                    </div>
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
            })
          ) : (
            <SurfaceCard>
              <EmptyState
                title="No matching buyers found yet"
                body="Widen the filters, review the partner network, or ask AgroGuide to help identify the closest demand-side match."
                actions={
                  <div className="inline-actions">
                    <Button href="/app/agro-intelligence/graph" size="md" variant="primary">
                      Explore partner network
                    </Button>
                    <Button href="/app/advisory/new" size="md" variant="ghost">
                      Ask AgroGuide
                    </Button>
                  </div>
                }
              />
            </SurfaceCard>
          )}
        </section>
      ) : null}

      {view === "coverage" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Regional coverage"
            title="Region-by-region buyer coverage"
            body="Use this view to see where buyer coverage is already strongest and where the network is still filling in."
          />
          {coverage.length > 0 ? (
            <div className="agro-coverage-grid">
              {coverage.map((bucket) => (
                <article className="agro-coverage-card" key={bucket.label}>
                  <strong>{bucket.label}</strong>
                  <span className="metric-value">{bucket.buyerCount}</span>
                  <p className="muted">
                    Top record: {bucket.topBuyerName}
                    <br />
                    Commodities: {bucket.commoditySpread.join(", ") || "Not tagged"}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No regional coverage yet"
              body="As more buyers collect enough location detail, this view will show where sourcing coverage is strongest."
            />
          )}
        </SurfaceCard>
      ) : null}

      {view === "compare" ? (
        <SurfaceCard>
          <SectionHeading
            eyebrow="Compare"
            title="Shortlist two or more buyers before you act"
            body="Compare trust, location, commodity fit, and recent verification side by side before you decide who to pursue."
          />
          {shortlistedBuyers.length > 0 ? (
            <div className="agro-compare-grid">
              {shortlistedBuyers.map((buyer) => (
                <article className="agro-compare-card" key={buyer.entity_id}>
                  <div className="stack-sm">
                    <strong>{buyer.canonical_name}</strong>
                    <div className="pill-row">
                      {buildEntityBadges(buyer, { isDemo }).map((badge) => (
                        <StatusPill key={`${buyer.entity_id}-${badge.label}`} tone={badge.tone}>
                          {badge.label}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                  <div className="stack-sm">
                    {buildCompareFields(buyer).map((field) => (
                      <div className="agro-compare-row" key={`${buyer.entity_id}-${field.label}`}>
                        <span>{field.label}</span>
                        <strong>{compareFieldValue(field.value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="inline-actions">
                    <Button href={`/app/agro-intelligence/buyers/${buyer.entity_id}`} size="sm" variant="primary">
                      Open profile
                    </Button>
                    <Button
                      onClick={() => toggleBuyer(buyer.entity_id)}
                      size="sm"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Add buyers to the shortlist first"
              body="Use the matching buyers view to save the strongest profiles, then return here to compare fit side by side."
            />
          )}
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="agro-shortlist-tray">
        <SectionHeading
          eyebrow="Shortlist"
          title="Keep the strongest matches close"
          body="Save buyers while you filter so the compare flow stays visible on both mobile and desktop."
        />
        {shortlistedBuyers.length > 0 ? (
          <div className="agro-shortlist-stack">
            {shortlistedBuyers.map((buyer) => (
              <div className="agro-shortlist-item" key={buyer.entity_id}>
                <div className="stack-sm">
                  <strong>{buyer.canonical_name}</strong>
                  <span className="muted">
                    {buyer.location_signature || "Location pending"} · {buyer.commodity_tags.join(", ") || "Not tagged"}
                  </span>
                </div>
                <div className="inline-actions">
                  <Link href={`/app/agro-intelligence/buyers/${buyer.entity_id}`}>Open profile</Link>
                  <button className="button-ghost" onClick={() => toggleBuyer(buyer.entity_id)} type="button">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No buyers in the shortlist yet"
            body="As you review the directory, save the strongest matches here before you move into compare or profile review."
          />
        )}
      </SurfaceCard>
    </AgroIntelligenceShell>
  );
}
