import Link from "next/link";
import React from "react";

import { StatusPill } from "@/components/ui-primitives";

type SellerCardProps = {
  listingCountLabel: string;
  memberSinceLabel: string;
  name: string;
  note: string;
  profileHref?: string | null;
  profileLabel?: string;
  ratingLabel: string;
  roleLabel: string;
};

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SellerCard(props: SellerCardProps) {
  return (
    <aside className="surface-card market-seller-card">
      <div className="market-seller-head">
        <div className="market-seller-avatar" aria-hidden="true">
          {initialsFor(props.name)}
        </div>
        <div className="stack-sm">
          <h3>{props.name}</h3>
          <p className="muted">{props.roleLabel}</p>
        </div>
      </div>

      <div className="pill-row">
        <StatusPill tone="online">Verified identity</StatusPill>
        <StatusPill tone="neutral">Rating stub</StatusPill>
      </div>

      <dl className="market-seller-meta">
        <div>
          <dt>Member since</dt>
          <dd>{props.memberSinceLabel}</dd>
        </div>
        <div>
          <dt>Rating</dt>
          <dd>{props.ratingLabel}</dd>
        </div>
        <div>
          <dt>Listings</dt>
          <dd>{props.listingCountLabel}</dd>
        </div>
      </dl>

      <p className="muted">{props.note}</p>

      {props.profileHref ? (
        <Link className="button-ghost" href={props.profileHref}>
          {props.profileLabel ?? "Open profile"}
        </Link>
      ) : (
        <span className="market-card-footnote">Public seller profile details will appear here as more seller information becomes available.</span>
      )}
    </aside>
  );
}
