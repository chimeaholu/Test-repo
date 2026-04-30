"use client";

import type { ListingRecord } from "@agrodomain/contracts";
import Link from "next/link";
import * as React from "react";

import {
  CalendarIcon,
  CropIcon,
  FieldIcon,
  MessageCircleIcon,
  ScaleIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ListingCardProps = {
  categoryLabel: string;
  commodityVisual: string;
  listing: ListingRecord;
  onOpenNegotiation?: (listingId: string) => void;
  postedLabel: string;
  postedTitle: string;
  sellerLabel: string;
};

export function ListingCard({
  categoryLabel,
  commodityVisual,
  listing,
  onOpenNegotiation,
  postedLabel,
  postedTitle,
  sellerLabel,
}: ListingCardProps) {
  return (
    <Card className="market-listing-card" variant="interactive">
      <div className={`market-listing-visual market-visual-${commodityVisual}`}>
        <div className="market-listing-visual-badges">
          <Badge variant="brand">{categoryLabel}</Badge>
          <Badge variant="neutral">{listing.commodity}</Badge>
        </div>
        <div className="market-listing-visual-body">
          <span className="market-listing-visual-icon">
            <CropIcon aria-hidden="true" size={28} />
          </span>
          <div>
            <p className="market-listing-kicker">Live listing</p>
            <strong>{listing.price_currency} {formatPrice(listing.price_amount)}</strong>
          </div>
        </div>
      </div>

      <div className="market-listing-card-body">
        <div className="market-listing-card-topline">
          <h3>{listing.title}</h3>
          <p>{listing.summary}</p>
        </div>

        <dl className="market-listing-meta">
          <div>
            <dt>
              <ScaleIcon aria-hidden="true" size={16} />
              Quantity
            </dt>
            <dd>{listing.quantity_tons} tons</dd>
          </div>
          <div>
            <dt>
              <FieldIcon aria-hidden="true" size={16} />
              Location
            </dt>
            <dd>{listing.location}</dd>
          </div>
          <div>
            <dt>
              <CalendarIcon aria-hidden="true" size={16} />
              Posted
            </dt>
            <dd title={postedTitle}>{postedLabel}</dd>
          </div>
        </dl>

        <div className="market-listing-footer">
          <div className="market-seller-row">
            <Avatar name={sellerLabel} size="md" />
            <div>
              <strong>{sellerLabel}</strong>
              <span>Revision {listing.published_revision_number ?? listing.revision_number}</span>
            </div>
          </div>

          <div className="market-listing-actions">
            <Button href={`/app/market/listings/${listing.listing_id}`} size="md" variant="primary">
              Inspect lot
            </Button>
            <Link
              className="market-inline-link"
              href={`/app/market/negotiations?listingId=${listing.listing_id}`}
              onClick={() => onOpenNegotiation?.(listing.listing_id)}
            >
              <MessageCircleIcon aria-hidden="true" size={16} />
              Open negotiation
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}
