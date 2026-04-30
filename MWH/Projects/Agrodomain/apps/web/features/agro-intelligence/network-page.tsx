"use client";

import Link from "next/link";

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
import { buildEntityBadges, buildEntityReason, isDemoSession } from "./model";

export function AgroIntelligenceNetworkPage() {
  const { session, traceId } = useAppState();
  const overviewQuery = useApiQuery(
    () => agroIntelligenceApi.getOverview(traceId),
    [traceId],
  );
  const entitiesQuery = useApiQuery(
    () => agroIntelligenceApi.listEntities(traceId),
    [traceId],
  );

  if (!session) {
    return null;
  }

  const isDemo = isDemoSession(session);
  const overview = overviewQuery.data;
  const entities = entitiesQuery.data?.items ?? [];
  const featured = [...entities]
    .sort((left, right) => {
      if (left.source_document_count !== right.source_document_count) {
        return right.source_document_count - left.source_document_count;
      }
      return right.confidence_score - left.confidence_score;
    })
    .slice(0, 6);

  return (
    <AgroIntelligenceShell
      description="Start from high-value buyers and processors, then see how relationships spread across the network."
      title="Explore the strongest connection points first"
      queueCount={overview?.verification_queue_count}
    >
      {(overviewQuery.error || entitiesQuery.error) ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {overviewQuery.error?.message ?? entitiesQuery.error?.message}
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeading
          eyebrow="Partner network"
          title="Explore the strongest connection points first"
          body="Start from high-value buyers and processors, then open the nearby records that matter most for commercial follow-up."
        />
        <div className="dashboard-grid">
          <article className="metric-card">
            <span className="metric-label">Featured connection points</span>
            <strong className="metric-value">{overview?.buyer_directory_count ?? "..."}</strong>
            <p className="muted">Buyer and processor records currently strong enough to start from.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Profiles worth opening next</span>
            <strong className="metric-value">{overview?.entity_count ?? "..."}</strong>
            <p className="muted">Organizations, facilities, commodities, and related partners already connected here.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">How to read the network</span>
            <strong className="metric-value">{overview?.verification_queue_count ?? "..."}</strong>
            <p className="muted">Start with the strongest records first and treat lower-confidence links as follow-up paths, not final answers.</p>
          </article>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Featured connection points"
          title="Profiles worth opening next"
          body="Open any node below to inspect the nearby connections, supporting verification, and next best follow-up."
        />
        {featured.length > 0 ? (
          <div className="agro-buyer-card-grid">
            {featured.map((entity) => (
              <article className="agro-buyer-card" key={entity.entity_id}>
                <div className="pill-row">
                  {buildEntityBadges(entity, { isDemo }).map((badge) => (
                    <StatusPill key={`${entity.entity_id}-${badge.label}`} tone={badge.tone}>
                      {badge.label}
                    </StatusPill>
                  ))}
                </div>
                <div className="stack-sm">
                  <strong className="agro-card-title">{entity.canonical_name}</strong>
                  <span className="muted">
                    {entity.entity_type.replaceAll("_", " ")} · {entity.location_signature || "Location pending"}
                  </span>
                </div>
                <p className="muted">{buildEntityReason(entity, session.actor.role)}</p>
                <div className="inline-actions">
                  <Link href={`/app/agro-intelligence/graph/${entity.entity_id}`}>Inspect node</Link>
                  <Link href={`/app/agro-intelligence/buyers/${entity.entity_id}`}>Open buyer profile</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No connection points yet"
            body="As more records resolve into the network, this page will highlight the strongest places to start."
          />
        )}
      </SurfaceCard>
    </AgroIntelligenceShell>
  );
}
