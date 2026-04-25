"use client";

import React from "react";
import Link from "next/link";

import { InsightCallout, StatusPill } from "@/components/ui-primitives";
import type { ListingWizardDraft } from "@/components/marketplace/listing-wizard/types";

type StepReviewProps = {
  draft: ListingWizardDraft;
  isSubmitting: boolean;
  onSubmit: (mode: "draft" | "publish") => Promise<void>;
  savedListingId: string | null;
};

function buildLocation(draft: ListingWizardDraft): string {
  return draft.locationManual.trim() || draft.locationPreset.trim();
}

export function ListingWizardStepReview({
  draft,
  isSubmitting,
  onSubmit,
  savedListingId,
}: StepReviewProps) {
  const location = buildLocation(draft);

  return (
    <div className="queue-grid">
      <article className="queue-card">
        <div className="pill-row">
          <StatusPill tone="neutral">{draft.pricingType}</StatusPill>
          <StatusPill tone="neutral">{draft.deliveryMode}</StatusPill>
          <StatusPill tone="neutral">{draft.photos.length} photos</StatusPill>
        </div>
        <h3>{draft.title}</h3>
        <p>{draft.description}</p>
        <ul className="summary-list">
          <li>
            <span>Commodity</span>
            <strong>
              {draft.commodity} • {draft.varietyGrade}
            </strong>
          </li>
          <li>
            <span>Category</span>
            <strong>{draft.category}</strong>
          </li>
          <li>
            <span>Pricing</span>
            <strong>
              {draft.priceAmount} {draft.priceCurrency}
            </strong>
          </li>
          <li>
            <span>Quantity / MOQ</span>
            <strong>
              {draft.quantityTons} tons • MOQ {draft.minimumOrderQuantity} tons
            </strong>
          </li>
          <li>
            <span>Availability</span>
            <strong>
              {draft.availabilityStart} to {draft.availabilityEnd}
            </strong>
          </li>
          <li>
            <span>Location</span>
            <strong>{location}</strong>
          </li>
        </ul>

        <div className="listing-review-card">
          <div className="listing-review-media">
            {draft.photos[0] ? <img alt={draft.photos[0].name} src={draft.photos[0].previewUrl} /> : <span>No photo</span>}
          </div>
          <div className="stack-sm">
            <p className="eyebrow">Marketplace card preview</p>
            <strong>{draft.title}</strong>
            <p className="muted">{draft.description}</p>
            <p className="muted">
              {draft.commodity} · {draft.quantityTons} tons · {draft.priceAmount} {draft.priceCurrency}
            </p>
            <p className="muted">{location}</p>
          </div>
        </div>

        <div className="actions-row">
          <button
            className="button-secondary"
            disabled={isSubmitting}
            type="button"
            onClick={() => void onSubmit("draft")}
          >
            {isSubmitting ? "Saving..." : "Save as draft"}
          </button>
          <button
            className="button-primary"
            disabled={isSubmitting}
            type="button"
            onClick={() => void onSubmit("publish")}
          >
            {isSubmitting ? "Publishing..." : "Publish listing"}
          </button>
        </div>
      </article>

      <article className="queue-card">
        <InsightCallout
          title="Uses the live marketplace command flow"
          body="Draft creation still runs through the existing listing mutation, and publish triggers the same command bus sequence already validated in R0."
          tone="brand"
        />
        {savedListingId ? (
          <div className="detail-stack">
            <p className="muted">Most recent draft reference: {savedListingId}</p>
            <Link className="button-ghost" href={`/app/market/listings/${savedListingId}`}>
              Open listing detail
            </Link>
          </div>
        ) : null}
      </article>
    </div>
  );
}
