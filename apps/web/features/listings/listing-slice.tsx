"use client";

import type { ListingCreateInput, ListingRecord, ListingUpdateInput } from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";

import { useAppState } from "@/components/app-provider";
import { EmptyState, ErrorState, InsightCallout, LoadingState, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { listingFormSchema, listingRecordToFormValues, type ListingFormValues } from "@/features/listings/schema";
import { getAuditEvents } from "@/lib/api/audit";
import { createListing as createListingCommand, updateListing as updateListingCommand } from "@/lib/api/commands";
import type { CommandMetadata } from "@/lib/api/commands";
import { getListings, getListing as fetchListing } from "@/lib/api/marketplace";
import { recordTelemetry } from "@/lib/telemetry/client";

type MutationEvidence = {
  actionLabel: string;
  listingId: string;
  requestId: string;
  idempotencyKey: string;
  auditEventCount: number;
  replayed: boolean;
} | null;

type ListingWorkspaceMode = "buyer-feed" | "owner-workspace";

const initialCreateForm: ListingFormValues = {
  title: "Premium cassava harvest",
  commodity: "Cassava",
  quantityTons: "4.2",
  priceAmount: "320",
  priceCurrency: "GHS",
  location: "Tamale, GH",
  summary: "Bagged cassava stock ready for pickup with moisture proof attached.",
  status: "draft",
};

function getListingWorkspaceMode(role: string): ListingWorkspaceMode {
  return role === "buyer" ? "buyer-feed" : "owner-workspace";
}

function isBuyerSafePublished(item: ListingRecord): boolean {
  return item.status === "published" && item.view_scope === "buyer_safe";
}

function recordListingViewTelemetry(
  traceId: string,
  detail: Record<string, string | number | boolean>,
): void {
  recordTelemetry({
    event: "listing_view",
    trace_id: traceId,
    timestamp: new Date().toISOString(),
    detail,
  });
}

function recordInquiryStartTelemetry(traceId: string, listingId: string, surface: "buyer_detail" | "buyer_feed"): void {
  recordTelemetry({
    event: "inquiry_start",
    trace_id: traceId,
    timestamp: new Date().toISOString(),
    detail: {
      listing_id: listingId,
      surface,
      interaction_mode: "static_navigation_only",
      negotiation_runtime_ready: false,
    },
  });
}

function buildOwnerPublishCue(listing: ListingRecord): { tone: "online" | "degraded" | "neutral"; title: string; body: string } {
  if (listing.status === "published" && !listing.has_unpublished_changes) {
    return {
      tone: "online",
      title: "Published to buyer discovery",
      body: `Revision ${listing.published_revision_number ?? listing.revision_number} is the current buyer-visible projection.`,
    };
  }
  if (listing.status === "published" && listing.has_unpublished_changes) {
    return {
      tone: "degraded",
      title: "Published with draft changes pending",
      body: "Buyers still see the last published revision while owner edits remain unpublished.",
    };
  }
  if (listing.status === "draft") {
    return {
      tone: "degraded",
      title: "Draft is owner-only",
      body: "This revision is not in buyer discovery until explicitly published.",
    };
  }
  return {
    tone: "neutral",
    title: "Closed from new discovery",
    body: "The listing remains in owner history but is not available for new buyer discovery.",
  };
}

function formValuesToCreateInput(values: ListingFormValues): ListingCreateInput {
  return {
    title: values.title.trim(),
    commodity: values.commodity.trim(),
    quantity_tons: Number(values.quantityTons),
    price_amount: Number(values.priceAmount),
    price_currency: values.priceCurrency.trim().toUpperCase(),
    location: values.location.trim(),
    summary: values.summary.trim(),
  };
}

function formValuesToUpdateInput(listingId: string, values: ListingFormValues): ListingUpdateInput {
  return {
    listing_id: listingId,
    ...formValuesToCreateInput(values),
    status: values.status,
  };
}

async function loadAuditEvidence(requestId: string, idempotencyKey: string): Promise<number> {
  const audit = await getAuditEvents({ request_id: requestId, idempotency_key: idempotencyKey });
  return audit.items.length;
}

function BuyerFeed(props: { items: ListingRecord[]; traceId: string }) {
  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Marketplace"
          title="Discover live lots without owner controls leaking into view"
          body="Buyer-safe cards surface quantity, price, revision count, and key trust signals, then route into a read-only lot detail view."
        />
        <div className="hero-kpi-grid" aria-label="Buyer market signals">
          <article className="hero-kpi">
            <span className="metric-label">Visible now</span>
            <strong>{props.items.length} published lot(s)</strong>
            <p className="muted">Only buyer-safe inventory appears in this feed.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Review posture</span>
            <strong>Read-only before offer</strong>
            <p className="muted">Buyers inspect lot context first, then move into negotiations intentionally.</p>
          </article>
        </div>
        <InsightCallout
          title="Draft leak prevention is explicit"
          body="Drafts, unpublished changes, and owner-only revisions stay out of discovery so buyers only see inventory that is ready for review."
          tone="accent"
        />
      </SurfaceCard>
      {props.items.length === 0 ? (
        <EmptyState
          title="No lots are ready for review yet"
          body="Published listings will appear here once sellers release buyer-visible inventory in your scope."
        />
      ) : (
        <div className="queue-list" role="list" aria-label="Published listings">
          {props.items.map((item) => (
            <article className="queue-item" key={item.listing_id} role="listitem">
              <div className="queue-item-head">
                <div className="pill-row">
                  <StatusPill tone="online">Published</StatusPill>
                  <StatusPill tone="neutral">{item.revision_count} revisions</StatusPill>
                </div>
                <h3>{item.title}</h3>
              </div>
              <p>{item.summary}</p>
              <p className="muted">
                {item.commodity} · {item.quantity_tons} tons · {item.price_amount} {item.price_currency}
              </p>
              <p className="muted">{item.location}</p>
              <div className="actions-row">
                <Link className="button-primary" href={`/app/market/listings/${item.listing_id}`}>
                  Review lot
                </Link>
                <Link
                  className="button-ghost"
                  href={`/app/market/negotiations?listingId=${item.listing_id}`}
                  onClick={() => recordInquiryStartTelemetry(props.traceId, item.listing_id, "buyer_feed")}
                >
                  Open negotiation inbox
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ListingSliceClient() {
  const { session, traceId } = useAppState();
  const [items, setItems] = useState<ListingRecord[]>([]);
  const [buyerItems, setBuyerItems] = useState<ListingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<ListingFormValues>(initialCreateForm);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<MutationEvidence>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshListings();
  }, [session, traceId]);

  useEffect(() => {
    if (!session || isLoading) {
      return;
    }
    const mode = getListingWorkspaceMode(session.actor.role);
    recordListingViewTelemetry(traceId, {
      actor_role: session.actor.role,
      surface: mode,
      listing_count: mode === "buyer-feed" ? buyerItems.length : items.length,
    });
  }, [buyerItems.length, isLoading, items.length, session, traceId]);

  async function refreshListings() {
    setIsLoading(true);
    try {
      const collection = await getListings();
      setItems(collection.items);
      setBuyerItems(collection.items.filter(isBuyerSafePublished));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load listings.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!session) {
    return null;
  }

  if (getListingWorkspaceMode(session.actor.role) === "buyer-feed") {
    return (
      <div className="content-stack">
        {isLoading ? (
          <LoadingState label="Loading available lots..." />
        ) : null}
        {!isLoading ? <BuyerFeed items={buyerItems} traceId={traceId} /> : null}
        {error ? <ErrorState title="Listings could not be loaded" body={error} /> : null}
      </div>
    );
  }

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Seller workspace"
          title="Create, revise, and publish inventory with clear market status"
          body="Manage lot details, publish when stock is ready, and keep buyer visibility explicit at every step."
        />
        <div className="hero-kpi-grid" aria-label="Seller market controls">
          <article className="hero-kpi">
            <span className="metric-label">Saved inventory</span>
            <strong>{items.length} lot(s)</strong>
            <p className="muted">Draft, published, and closed states stay visibly distinct.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Buyer-safe live view</span>
            <strong>{buyerItems.length} published lot(s)</strong>
            <p className="muted">Only this subset is visible in buyer discovery.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Receipt evidence</span>
            <strong>{evidence ? "Available" : "Pending first save"}</strong>
            <p className="muted">Every create or update returns traceable request metadata.</p>
          </article>
        </div>
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading
            eyebrow="New listing"
            title="Add a lot"
            body="Enter the commercial details buyers need first. Identity, country scope, validation, and audit controls are enforced when the listing is saved."
          />
          <div className="journey-grid compact-grid" aria-label="Seller workflow rules">
            <article className="journey-card subtle">
              <h3>Commercial fields first</h3>
              <p className="muted">The form leads with the details buyers need to make a first-pass decision.</p>
            </article>
            <article className="journey-card subtle">
              <h3>Publish is explicit</h3>
              <p className="muted">Nothing becomes buyer-visible until a published revision exists.</p>
            </article>
          </div>
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError(null);

              const parsed = listingFormSchema.safeParse(formValues);
              if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? "Check the listing fields and try again.");
                setIsSubmitting(false);
                return;
              }

              try {
                const meta: CommandMetadata = {
                  actor_id: session.actor.actor_id,
                  country_code: session.actor.country_code,
                  correlation_id: traceId,
                };
                const creation = await createListingCommand(
                  formValuesToCreateInput(parsed.data),
                  meta,
                );
                const createdListing = (creation.result as { listing: ListingRecord }).listing;
                const auditEventCount = await loadAuditEvidence(
                  creation.request_id,
                  creation.idempotency_key,
                );
                setEvidence({
                  actionLabel: "Create committed",
                  listingId: createdListing.listing_id,
                  requestId: creation.request_id,
                  idempotencyKey: creation.idempotency_key,
                  auditEventCount,
                  replayed: creation.replayed,
                });
                setFormValues(initialCreateForm);
                await refreshListings();
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : "Unable to create listing.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="title">Listing title</label>
              <input
                id="title"
                name="title"
                onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))}
                value={formValues.title}
              />
            </div>
            <div className="field">
              <label htmlFor="commodity">Commodity</label>
              <input
                id="commodity"
                name="commodity"
                onChange={(event) => setFormValues((current) => ({ ...current, commodity: event.target.value }))}
                value={formValues.commodity}
              />
            </div>
            <div className="grid-two">
              <div className="field">
                <label htmlFor="quantityTons">Quantity (tons)</label>
                <input
                  id="quantityTons"
                  name="quantityTons"
                  onChange={(event) => setFormValues((current) => ({ ...current, quantityTons: event.target.value }))}
                  step="0.1"
                  type="number"
                  value={formValues.quantityTons}
                />
              </div>
              <div className="field">
                <label htmlFor="priceAmount">Price amount</label>
                <input
                  id="priceAmount"
                  name="priceAmount"
                  onChange={(event) => setFormValues((current) => ({ ...current, priceAmount: event.target.value }))}
                  step="0.01"
                  type="number"
                  value={formValues.priceAmount}
                />
              </div>
            </div>
            <div className="grid-two">
              <div className="field">
                <label htmlFor="priceCurrency">Currency</label>
                <input
                  id="priceCurrency"
                  name="priceCurrency"
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, priceCurrency: event.target.value.toUpperCase() }))
                  }
                  value={formValues.priceCurrency}
                />
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  name="location"
                  onChange={(event) => setFormValues((current) => ({ ...current, location: event.target.value }))}
                  value={formValues.location}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="summary">Summary</label>
              <textarea
                id="summary"
                name="summary"
                onChange={(event) => setFormValues((current) => ({ ...current, summary: event.target.value }))}
                rows={5}
                value={formValues.summary}
              />
            </div>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="actions-row">
              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving listing..." : "Create listing"}
              </button>
              <p className="muted detail-note">This creates an owner-safe record first. Buyer discovery follows publication rules.</p>
            </div>
          </form>
        </article>

        <article className="queue-card">
          <SectionHeading
            eyebrow="Submission receipt"
            title="Latest save result"
            body="Each create and update returns request metadata so teams can confirm whether a change was applied once or replayed safely."
          />
          {evidence ? (
            <div className="detail-stack">
              <div className="pill-row">
                <StatusPill tone="online">{evidence.actionLabel}</StatusPill>
                <StatusPill tone={evidence.replayed ? "degraded" : "neutral"}>
                  {evidence.replayed ? "Replayed" : "Single effect"}
                </StatusPill>
              </div>
              <p className="muted">Listing ID: {evidence.listingId}</p>
              <p className="muted">Request ID: {evidence.requestId}</p>
              <p className="muted">Idempotency key: {evidence.idempotencyKey}</p>
              <p className="muted">Audit events returned: {evidence.auditEventCount}</p>
              <Link className="button-secondary" href={`/app/market/listings/${evidence.listingId}`}>
                Open lot details
              </Link>
            </div>
          ) : (
            <InsightCallout
              title="No saved listing yet"
              body="Create your first lot to unlock publish, revision, and buyer-visibility controls."
              tone="accent"
            />
          )}
        </article>
      </div>

      <SurfaceCard>
        <SectionHeading
          eyebrow="Your inventory"
          title="Saved lots"
          body="Each listing keeps its publish status, buyer visibility, and revision cues visible so nothing is accidentally exposed."
        />
        <div className="hero-kpi-grid" aria-label="Inventory visibility snapshot">
          <article className="hero-kpi">
            <span className="metric-label">Draft or closed</span>
            <strong>{items.filter((item) => item.status !== "published").length} lot(s)</strong>
            <p className="muted">These entries are not in active buyer discovery.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Published</span>
            <strong>{items.filter((item) => item.status === "published").length} lot(s)</strong>
            <p className="muted">Published lots retain revision and visibility cues on every card.</p>
          </article>
        </div>
        {isLoading ? <p className="muted" role="status">Loading inventory...</p> : null}
        {!isLoading && items.length === 0 ? <p className="muted">You have not saved any listings yet.</p> : null}
        <div className="queue-list" role="list" aria-label="Owner listing collection">
          {items.map((item) => (
            <article className="queue-item" key={item.listing_id} role="listitem">
              <div className="queue-item-head">
                <div className="pill-row">
                  <StatusPill tone={item.status === "published" ? "online" : item.status === "draft" ? "degraded" : "neutral"}>
                    {item.status}
                  </StatusPill>
                  <StatusPill tone="neutral">{item.view_scope === "buyer_safe" ? "Buyer-safe view" : "Owner-only view"}</StatusPill>
                </div>
                <h3>{item.title}</h3>
              </div>
              <p>{item.summary}</p>
              <p className="muted">
                {item.commodity} · {item.quantity_tons} tons · {item.price_amount} {item.price_currency} · {item.location}
              </p>
              <div className="actions-row">
                <Link className="button-ghost" href={`/app/market/listings/${item.listing_id}`}>
                  View and edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function BuyerListingDetail(props: { listing: ListingRecord; traceId: string }) {
  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Lot overview"
          title={props.listing.title}
          body="This page is read-only for buyers and shows only published lot information that is safe for market review."
        />
        <div className="hero-kpi-grid" aria-label="Lot quick view">
          <article className="hero-kpi">
            <span className="metric-label">Commodity</span>
            <strong>{props.listing.commodity}</strong>
            <p className="muted">{props.listing.quantity_tons} tons ready for review.</p>
          </article>
          <article className="hero-kpi">
            <span className="metric-label">Commercial anchor</span>
            <strong>
              {props.listing.price_amount} {props.listing.price_currency}
            </strong>
            <p className="muted">{props.listing.location}</p>
          </article>
        </div>
      </SurfaceCard>
      <div className="queue-grid">
        <article className="queue-card">
          <div className="pill-row">
            <StatusPill tone="online">Published</StatusPill>
            <StatusPill tone="neutral">{props.listing.revision_count} revisions</StatusPill>
          </div>
          <p>{props.listing.summary}</p>
          <p className="muted">Commodity: {props.listing.commodity}</p>
          <p className="muted">Quantity: {props.listing.quantity_tons} tons</p>
          <p className="muted">
            Price: {props.listing.price_amount} {props.listing.price_currency}
          </p>
          <p className="muted">Location: {props.listing.location}</p>
          <div className="actions-row">
            <Link
              className="button-primary"
              href={`/app/market/negotiations?listingId=${props.listing.listing_id}`}
              onClick={() => recordInquiryStartTelemetry(props.traceId, props.listing.listing_id, "buyer_detail")}
            >
              Open negotiation inbox
            </Link>
            <Link className="button-ghost" href="/app/market/listings">
              Back to feed
            </Link>
          </div>
        </article>
        <article className="queue-card">
          <InsightCallout
            title="Buyer-safe affordance boundary"
            body="Owner edit controls and unpublished revision data are intentionally excluded. Buyers move from this page into the offer workflow without seeing seller-only tools."
            tone="brand"
          />
        </article>
      </div>
    </div>
  );
}

export function ListingDetailClient({ listingId }: { listingId: string }) {
  const { session, traceId } = useAppState();
  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [formValues, setFormValues] = useState<ListingFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticState, setOptimisticState] = useState<"idle" | "pending" | "reconciled">("idle");
  const [evidence, setEvidence] = useState<MutationEvidence>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const record = await fetchListing(listingId);
          if (cancelled) {
            return;
          }
          if (getListingWorkspaceMode(session.actor.role) === "buyer-feed" && !isBuyerSafePublished(record)) {
            setListing(null);
            setFormValues(null);
            setError("listing_not_published");
            return;
          }
          setListing(record);
          setFormValues(listingRecordToFormValues(record));
          setError(null);
          recordListingViewTelemetry(traceId, {
            actor_role: session.actor.role,
            surface: getListingWorkspaceMode(session.actor.role) === "buyer-feed" ? "buyer_detail" : "owner_detail",
            listing_id: record.listing_id,
            revision_count: record.revision_count,
            published: record.status === "published",
          });
          return;
        } catch (nextError) {
          if (attempt === 4 || cancelled) {
            setError(nextError instanceof Error ? nextError.message : "Unable to load listing.");
            return;
          }
          await new Promise((resolve) => {
            window.setTimeout(resolve, 250 * (attempt + 1));
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, session, traceId]);

  if (!session) {
    return null;
  }

  if (getListingWorkspaceMode(session.actor.role) === "buyer-feed") {
    if (error) {
      return (
        <ErrorState title="Lot details are unavailable" body={error} />
      );
    }
    return listing ? <BuyerListingDetail listing={listing} traceId={traceId} /> : null;
  }

  async function saveEdit() {
    if (!listing || !formValues || !session) {
      return;
    }

    const parsed = listingFormSchema.safeParse(formValues);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the listing fields and try again.");
      return;
    }

    const optimisticListing: ListingRecord = {
      ...listing,
      ...formValuesToUpdateInput(listing.listing_id, parsed.data),
      schema_version: listing.schema_version,
      actor_id: listing.actor_id,
      country_code: listing.country_code,
      created_at: listing.created_at,
      updated_at: new Date().toISOString(),
      revision_count: listing.revision_count,
      revision_number: listing.revision_number,
      published_revision_number: listing.published_revision_number,
      has_unpublished_changes: true,
      view_scope: listing.view_scope,
      published_at: listing.published_at,
    };

    const previousListing = listing;
    setError(null);
    setIsSaving(true);
    setOptimisticState("pending");
    setListing(optimisticListing);

    try {
      const meta: CommandMetadata = {
        actor_id: session.actor.actor_id,
        country_code: session.actor.country_code,
        correlation_id: traceId,
      };
      const update = await updateListingCommand(
        formValuesToUpdateInput(listing.listing_id, parsed.data),
        meta,
      );
      const updatedRecord = (update.result as { listing: ListingRecord }).listing;
      const auditEventCount = await loadAuditEvidence(update.request_id, update.idempotency_key);
      setListing(updatedRecord);
      setFormValues(listingRecordToFormValues(updatedRecord));
      setOptimisticState("reconciled");
      setEvidence({
        actionLabel: "Edit committed",
        listingId: updatedRecord.listing_id,
        requestId: update.request_id,
        idempotencyKey: update.idempotency_key,
        auditEventCount,
        replayed: update.replayed,
      });
    } catch (nextError) {
      setListing(previousListing);
      setOptimisticState("idle");
      setError(nextError instanceof Error ? nextError.message : "Unable to save listing changes.");
    } finally {
      setIsSaving(false);
    }
  }

  const cue = listing ? buildOwnerPublishCue(listing) : null;

  return (
    <div className="content-stack">
      <SurfaceCard>
        <SectionHeading
          eyebrow="Listing detail"
          title={listing?.title ?? "Loading listing"}
          body="Owner detail keeps edit controls in an owner-safe surface and makes publish/revision state explicit."
        />
        {listing ? (
          <div className="hero-kpi-grid" aria-label="Owner lot status">
            <article className="hero-kpi">
              <span className="metric-label">Current status</span>
              <strong>{listing.status}</strong>
              <p className="muted">Revision {listing.revision_number} of {listing.revision_count} is loaded.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Visibility boundary</span>
              <strong>{listing.view_scope === "buyer_safe" ? "Buyer-safe" : "Owner-only"}</strong>
              <p className="muted">{listing.has_unpublished_changes ? "Unpublished edits are present." : "Published state is currently aligned."}</p>
            </article>
          </div>
        ) : null}
      </SurfaceCard>

      {error ? (
        <SurfaceCard>
          <p className="field-error">{error}</p>
        </SurfaceCard>
      ) : null}

      {listing && formValues ? (
        <div className="queue-grid">
          <article className="queue-card">
            <SectionHeading
              eyebrow="Edit listing"
              title="Owner edit flow"
              body="Changes are applied immediately and then confirmed with the server."
            />
            <form
              className="form-stack"
              onSubmit={async (event) => {
                event.preventDefault();
                await saveEdit();
              }}
            >
              <div className="field">
                <label htmlFor="edit-title">Listing title</label>
                <input
                  id="edit-title"
                  onChange={(event) => setFormValues((current) => (current ? { ...current, title: event.target.value } : current))}
                  value={formValues.title}
                />
              </div>
              <div className="field">
                <label htmlFor="edit-commodity">Commodity</label>
                <input
                  id="edit-commodity"
                  onChange={(event) =>
                    setFormValues((current) => (current ? { ...current, commodity: event.target.value } : current))
                  }
                  value={formValues.commodity}
                />
              </div>
              <div className="grid-two">
                <div className="field">
                  <label htmlFor="edit-quantity">Quantity (tons)</label>
                  <input
                    id="edit-quantity"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, quantityTons: event.target.value } : current))
                    }
                    step="0.1"
                    type="number"
                    value={formValues.quantityTons}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-price">Price amount</label>
                  <input
                    id="edit-price"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, priceAmount: event.target.value } : current))
                    }
                    step="0.01"
                    type="number"
                    value={formValues.priceAmount}
                  />
                </div>
              </div>
              <div className="grid-two">
                <div className="field">
                  <label htmlFor="edit-currency">Currency</label>
                  <input
                    id="edit-currency"
                    onChange={(event) =>
                      setFormValues((current) =>
                        current ? { ...current, priceCurrency: event.target.value.toUpperCase() } : current,
                      )
                    }
                    value={formValues.priceCurrency}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-location">Location</label>
                  <input
                    id="edit-location"
                    onChange={(event) =>
                      setFormValues((current) => (current ? { ...current, location: event.target.value } : current))
                    }
                    value={formValues.location}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  onChange={(event) =>
                    setFormValues((current) =>
                      current
                        ? { ...current, status: event.target.value as ListingFormValues["status"] }
                        : current,
                    )
                  }
                  value={formValues.status}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-summary">Summary</label>
                <textarea
                  id="edit-summary"
                  onChange={(event) =>
                    setFormValues((current) => (current ? { ...current, summary: event.target.value } : current))
                  }
                  rows={5}
                  value={formValues.summary}
                />
              </div>
              <div className="actions-row">
                <button className="button-primary" disabled={isSaving} type="submit">
                  {isSaving ? "Saving changes..." : "Save listing edits"}
                </button>
                <Link className="button-ghost" href="/app/market/listings">
                  Back to listings
                </Link>
              </div>
            </form>
          </article>

          <article className="queue-card">
            <SectionHeading eyebrow="Publish and revision cues" title={listing.commodity} />
            <div className="detail-stack">
              {cue ? (
                <InsightCallout
                  title={cue.title}
                  body={cue.body}
                  tone={cue.tone === "online" ? "brand" : cue.tone === "degraded" ? "accent" : "neutral"}
                />
              ) : null}
              <div className="pill-row">
                <StatusPill tone={optimisticState === "pending" ? "degraded" : "online"}>{listing.status}</StatusPill>
                <StatusPill tone="neutral">Revision {listing.revision_number}</StatusPill>
                <StatusPill tone="neutral">{listing.revision_count} total revisions</StatusPill>
                {optimisticState !== "idle" ? (
                  <StatusPill tone={optimisticState === "pending" ? "degraded" : "online"}>
                    {optimisticState === "pending" ? "Optimistic update pending" : "Optimistic state reconciled"}
                  </StatusPill>
                ) : null}
              </div>
              <p className="muted">Buyer-safe visibility: {listing.view_scope === "buyer_safe" ? "Yes" : "No"}</p>
              <p className="muted">Has unpublished changes: {listing.has_unpublished_changes ? "Yes" : "No"}</p>
              <p className="muted">Quantity: {listing.quantity_tons} tons</p>
              <p className="muted">
                Price: {listing.price_amount} {listing.price_currency}
              </p>
              <p className="muted">Location: {listing.location}</p>
              <p className="muted">Created at: {listing.created_at}</p>
              <p className="muted">Updated at: {listing.updated_at}</p>
            </div>
            {evidence ? (
              <InsightCallout
                title={`${evidence.actionLabel} with audit linkage`}
                body={`Request ${evidence.requestId} returned ${evidence.auditEventCount} audit events for idempotency key ${evidence.idempotencyKey}.`}
                tone="brand"
              />
            ) : (
              <InsightCallout
                title="Awaiting first edit"
                body="Save a change once to confirm owner edit and audit linkage while keeping buyer-safe discovery boundaries intact."
                tone="accent"
              />
            )}
          </article>
        </div>
      ) : null}
    </div>
  );
}
