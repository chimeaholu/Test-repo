"use client";

import type { ListingRecord } from "@agrodomain/contracts";
import Link from "next/link";
import React from "react";

import { StatusPill } from "@/components/ui-primitives";

type ListingManagementCardProps = {
  editHref: string;
  isBusy?: boolean;
  isSelected: boolean;
  listing: ListingRecord;
  offersReceived: number;
  onDelete?: () => void;
  onSelect: (checked: boolean) => void;
  onToggleStatus: () => void;
  viewsLabel: string;
};

function statusTone(status: ListingRecord["status"]): "online" | "degraded" | "neutral" {
  if (status === "published") {
    return "online";
  }
  if (status === "draft") {
    return "degraded";
  }
  return "neutral";
}

export function ListingManagementCard(props: ListingManagementCardProps) {
  const actionLabel = props.listing.status === "published" ? "Unpublish" : "Publish";
  const reviewState =
    props.listing.status === "draft" || props.listing.has_unpublished_changes ? "Needs attention" : props.listing.status === "published" ? "Live now" : "Completed";

  return (
    <article className="queue-card market-management-card">
      <div className="market-management-top">
        <label className="market-management-select">
          <input
            checked={props.isSelected}
            onChange={(event) => props.onSelect(event.target.checked)}
            type="checkbox"
          />
          <span>Select</span>
        </label>
        <div className="pill-row">
          <StatusPill tone={statusTone(props.listing.status)}>{props.listing.status}</StatusPill>
          <StatusPill tone={props.listing.has_unpublished_changes || props.listing.status === "draft" ? "degraded" : props.listing.status === "published" ? "online" : "neutral"}>
            {reviewState}
          </StatusPill>
        </div>
      </div>

      <div className="market-management-body">
        <div className="market-management-thumb" aria-hidden="true">
          <span>{props.listing.commodity.slice(0, 1)}</span>
        </div>

        <div className="content-stack">
          <div className="stack-sm">
            <h3>{props.listing.title}</h3>
            <p className="muted">
              {props.listing.commodity} · {props.listing.location}
            </p>
          </div>

          <dl className="market-management-metrics">
            <div>
              <dt>Price</dt>
              <dd>
                {props.listing.price_amount} {props.listing.price_currency}
              </dd>
            </div>
            <div>
              <dt>Views</dt>
              <dd>{props.viewsLabel}</dd>
            </div>
            <div>
              <dt>Offers</dt>
              <dd>{props.offersReceived}</dd>
            </div>
          </dl>

          <div className="actions-row">
            <Link className="button-ghost" href={props.editHref}>
              Review details
            </Link>
            <button className="button-secondary" disabled={props.isBusy} onClick={props.onToggleStatus} type="button">
              {props.isBusy ? "Saving..." : actionLabel}
            </button>
            <button
              className="button-ghost market-action-disabled"
              disabled
              onClick={props.onDelete}
              title="Delete will be enabled when the marketplace delete API ships."
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
