"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  buildDetailActionHref,
  buildEntityBadges,
  buildEntityReason,
  isDemoSession,
  isOperatorRole,
  readShortlist,
  toggleShortlistItem,
  writeShortlist,
} from "./model";

function relationshipLabel(type: string): string {
  if (type === "belongs_to") {
    return "belongs to";
  }
  if (type === "operates") {
    return "operates";
  }
  if (type === "stores_or_processes") {
    return "stores or processes";
  }
  if (type === "trades") {
    return "trades";
  }
  if (type === "serves") {
    return "serves";
  }
  return type.replaceAll("_", " ");
}

function sourceTierLabel(sourceTier: string): string {
  if (sourceTier === "A") {
    return "Direct source";
  }
  if (sourceTier === "B") {
    return "Partner source";
  }
  return "Supporting source";
}

export function AgroIntelligenceEntityDetailPage(props: {
  entityId: string;
  mode: "buyer-profile" | "graph";
}) {
  const { session, traceId } = useAppState();
  const [showEvidence, setShowEvidence] = useState(props.mode === "graph");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const entityQuery = useApiQuery(
    () => agroIntelligenceApi.getEntity(props.entityId, traceId),
    [props.entityId, traceId],
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    setShortlist(readShortlist(session.actor.country_code));
  }, [session]);

  if (!session) {
    return null;
  }

  const entity = entityQuery.data;
  const isDemo = isDemoSession(session);
  const canReview = isOperatorRole(session.actor.role);
  const shortlisted = entity ? shortlist.includes(entity.entity_id) : false;

  const toggleShortlist = () => {
    if (!entity) {
      return;
    }
    const next = toggleShortlistItem(shortlist, entity.entity_id);
    setShortlist(next);
    writeShortlist(session.actor.country_code, next);
  };

  return (
    <AgroIntelligenceShell
      description={
        props.mode === "buyer-profile"
          ? "Review fit, location, demand profile, and trust signals before you decide to pursue this relationship."
          : "See why this record matters, what supports trust, and how it connects to nearby partners."
      }
      title={props.mode === "buyer-profile" ? "Buyer profile" : "Partner network detail"}
      queueCount={entity?.pending_claim_count}
    >
      {entityQuery.error ? (
        <SurfaceCard>
          <p className="field-error" role="alert">
            {entityQuery.error.message}
          </p>
        </SurfaceCard>
      ) : null}

      {entity ? (
        <>
          <div className="agro-detail-grid">
            <SurfaceCard className="agro-detail-main">
              <div className="stack-md">
                <div className="pill-row">
                  {buildEntityBadges(entity, { isDemo }).map((badge) => (
                    <StatusPill key={`${entity.entity_id}-${badge.label}`} tone={badge.tone}>
                      {badge.label}
                    </StatusPill>
                  ))}
                </div>
                <SectionHeading
                  eyebrow={props.mode === "buyer-profile" ? "Buyer profile" : "Partner network detail"}
                  title={entity.canonical_name}
                  body={buildEntityReason(entity, session.actor.role)}
                />
                <InfoList
                  items={[
                    { label: "Location", value: entity.location_signature || "Location pending" },
                    { label: "Trust level", value: buildEntityBadges(entity)[0]?.label ?? "Not available yet" },
                    { label: "Recent check", value: entity.freshness_status.replaceAll("_", " ") },
                    { label: "Verification sources", value: entity.source_document_count },
                    { label: "Nearby connections", value: entity.relationships.length },
                    { label: "Follow-up items", value: entity.pending_claim_count },
                  ]}
                />
                <div className="agro-card-meta">
                  <span>{entity.commodity_tags.join(", ") || "Commodity tags pending"}</span>
                  <span>{entity.operator_tags.join(", ") || "Operator tags pending"}</span>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="agro-detail-actions">
              <SectionHeading
                eyebrow="Next actions"
                title="Turn this record into action"
                body="The upper-right action stack is intentionally compact so the next move is obvious."
              />
              <div className="agro-detail-action-stack">
                <Button onClick={toggleShortlist} size="md" variant={shortlisted ? "secondary" : "primary"}>
                  {shortlisted ? "Saved buyer" : "Save buyer"}
                </Button>
                {props.mode === "buyer-profile" ? (
                  <>
                    <Button href="/app/agro-intelligence/buyers" size="md" variant="secondary">
                      Compare with shortlist
                    </Button>
                    <Button href={`/app/agro-intelligence/graph/${entity.entity_id}`} size="md" variant="ghost">
                      Explore partner network
                    </Button>
                    <Button href={buildDetailActionHref(entity, "guide")} size="md" variant="ghost">
                      Ask AgroGuide if this fits
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href={`/app/agro-intelligence/buyers/${entity.entity_id}`} size="md" variant="secondary">
                      Open related profile
                    </Button>
                    <Button onClick={() => setShowEvidence(true)} size="md" variant="ghost">
                      View source details
                    </Button>
                  </>
                )}
                {canReview ? (
                  <Button href={`/app/agro-intelligence/workspace`} size="md" variant="ghost">
                    Open review workspace
                  </Button>
                ) : null}
              </div>
            </SurfaceCard>
          </div>

          <div className="dashboard-grid">
            <SurfaceCard>
              <SectionHeading
                eyebrow={props.mode === "buyer-profile" ? "Commercial fit" : "Why this partner matters"}
                title={props.mode === "buyer-profile" ? "Commercial fit" : "Why this record matters"}
                body="Use this summary first to decide whether the record is worth deeper review."
              />
              <InfoList
                items={[
                  {
                    label: props.mode === "buyer-profile" ? "Best-fit commodities" : "Commercial focus",
                    value: entity.commodity_tags.join(", ") || "Not tagged",
                  },
                  { label: "Nearby partners", value: entity.relationships.length },
                  { label: "Recent activity", value: entity.freshness?.observed_at ?? "n/a" },
                  { label: "Follow-up items", value: entity.pending_claim_count },
                ]}
              />
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                eyebrow={props.mode === "buyer-profile" ? "Verification and sources" : "Supporting verification"}
                title={props.mode === "buyer-profile" ? "Verification and sources" : "Source detail"}
                body="Keep the source detail available without letting it crowd out the main commercial story."
                actions={
                  <Button
                    onClick={() => setShowEvidence((current) => !current)}
                    size="sm"
                    variant="ghost"
                  >
                    {showEvidence ? "Hide source details" : "View source details"}
                  </Button>
                }
              />
              <p className="muted">
                {entity.source_document_count} source record{entity.source_document_count === 1 ? "" : "s"} support this profile.
              </p>
              {showEvidence ? (
                <div className="agro-evidence-stack">
                  {entity.source_documents.length > 0 ? (
                    entity.source_documents.map((document) => (
                      <article className="agro-evidence-card" key={document.document_id}>
                        <div className="agro-evidence-head">
                          <strong>{document.title}</strong>
                          <StatusPill tone={document.source_tier === "A" ? "online" : document.source_tier === "B" ? "neutral" : "degraded"}>
                            {sourceTierLabel(document.source_tier)}
                          </StatusPill>
                        </div>
                        <p className="muted">
                          {document.document_kind.replaceAll("_", " ")} · {document.partner_slug || "public source"} · {document.collected_at}
                        </p>
                        <p className="muted">Checked by: {document.legal_basis.replaceAll("_", " ")}</p>
                      </article>
                    ))
                  ) : (
                    <EmptyState
                      title="No linked source documents"
                      body="This record is already visible here, but the current verification depth is still limited."
                    />
                  )}
                </div>
              ) : null}
            </SurfaceCard>
          </div>

          <SurfaceCard>
            <SectionHeading
              eyebrow={props.mode === "buyer-profile" ? "Location and reach" : "Nearby connections"}
              title={
                props.mode === "buyer-profile"
                  ? "Linked facilities, commodities, and counterparties"
                  : "Profiles worth opening next"
              }
              body={
                props.mode === "buyer-profile"
                  ? "Review the nearby partners and linked facilities that strengthen this buyer profile."
                  : "Use the closest relevant connections first instead of trying to read the whole network at once."
              }
            />
            {entity.relationships.length > 0 ? (
              <div className="agro-relationship-stack">
                {entity.relationships.map((relationship) => (
                  <article className="agro-relationship-card" key={relationship.relationship_id}>
                    <div className="agro-relationship-copy">
                      <strong>{relationship.other_entity_name}</strong>
                      <p className="muted">
                        {relationship.direction === "outgoing" ? "This entity" : relationship.other_entity_name}{" "}
                        {relationshipLabel(relationship.relationship_type)}{" "}
                        {relationship.direction === "outgoing" ? relationship.other_entity_name : entity.canonical_name}.
                      </p>
                    </div>
                    <div className="pill-row">
                      <StatusPill tone={relationship.trust_tier === "gold" ? "online" : relationship.trust_tier === "silver" ? "neutral" : "degraded"}>
                        {relationship.trust_tier === "gold"
                          ? "Trusted"
                          : relationship.trust_tier === "silver"
                            ? "Verified"
                            : "Limited verification"}
                      </StatusPill>
                      <StatusPill tone="neutral">{relationship.lifecycle_state.replaceAll("_", " ")}</StatusPill>
                    </div>
                    <div className="inline-actions">
                      <Link href={`/app/agro-intelligence/graph/${relationship.other_entity_id}`}>Inspect node</Link>
                      <span className="muted">{relationship.provenance.length} linked source paths</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nearby connection detail is still growing"
                body="This record may still be useful for sourcing even while the broader connection map fills in."
              />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow={props.mode === "buyer-profile" ? "Verification and sources" : "Claims and review notes"}
              title={props.mode === "buyer-profile" ? "Recent verification detail" : "Claims and review notes"}
              body="Keep the lower section for the details that explain why this record may still need human judgment."
            />
            <div className="dashboard-grid">
              <InfoList
                items={[
                  { label: "Verification expires", value: entity.freshness?.expires_at ?? "n/a" },
                  { label: "Review again after", value: entity.freshness?.stale_after_days ?? "n/a" },
                  { label: "Follow-up items", value: entity.pending_claim_count },
                  { label: "Consent status", value: entity.consent_artifact?.status ?? "not required" },
                ]}
              />
              <div className="stack-md">
                {entity.verification_claims.length > 0 ? (
                  entity.verification_claims.map((claim) => (
                    <article className="stat-chip" key={claim.claim_id}>
                      <span className="metric-label">{claim.verifier_type}</span>
                      <strong>{claim.claim_target}</strong>
                      <span className="muted">
                        {claim.claim_state} · {claim.occurred_at}
                      </span>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="No review notes yet"
                    body="As checks and operator decisions accumulate, they will stay visible here."
                  />
                )}
              </div>
            </div>
          </SurfaceCard>
        </>
      ) : (
        <SurfaceCard>
          <p className="muted">Checking verified record…</p>
        </SurfaceCard>
      )}
    </AgroIntelligenceShell>
  );
}
