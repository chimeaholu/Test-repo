"use client";

import React from "react";

import type { ActorSearchItem } from "@/lib/api/identity";

export function RecipientSearch(props: {
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (recipient: ActorSearchItem) => void;
  query: string;
  results: ActorSearchItem[];
  selectedRecipient: ActorSearchItem | null;
}) {
  return (
    <div className="content-stack">
      <div className="wallet-search-row">
        <div className="field">
          <label htmlFor="wallet-recipient-search">Recipient name or email</label>
          <input
            id="wallet-recipient-search"
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Search by name, email, or actor ID"
            value={props.query}
          />
        </div>
        <button className="button-secondary" disabled={props.query.trim().length < 2 || props.isSearching} onClick={props.onSearch} type="button">
          {props.isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {props.selectedRecipient ? (
        <div className="wallet-search-result wallet-search-result-active">
          <strong>{props.selectedRecipient.display_name}</strong>
          <p>{props.selectedRecipient.email}</p>
          <span>
            {props.selectedRecipient.role} · {props.selectedRecipient.organization_name}
          </span>
        </div>
      ) : null}

      <div className="wallet-search-results" role="list" aria-label="Recipient search results">
        {props.results.map((recipient) => {
          const isSelected = props.selectedRecipient?.actor_id === recipient.actor_id;
          return (
            <button
              className={`wallet-search-result ${isSelected ? "wallet-search-result-active" : ""}`}
              key={recipient.actor_id}
              onClick={() => props.onSelect(recipient)}
              type="button"
            >
              <strong>{recipient.display_name}</strong>
              <p>{recipient.email}</p>
              <span>
                {recipient.role} · {recipient.organization_name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
