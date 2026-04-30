"use client";

import React from "react";
import type { NegotiationThreadRead } from "@agrodomain/contracts";

import { StatusPill } from "@/components/ui-primitives";
import { deriveNegotiationThreadUiState } from "@/features/negotiation/thread-state";

type ConversationListProps = {
  actorId: string;
  query: string;
  selectedThreadId: string;
  threads: NegotiationThreadRead[];
  onQueryChange: (value: string) => void;
  onSelectThread: (threadId: string) => void;
  renderTitle: (thread: NegotiationThreadRead) => string;
};

function lastVisibleActor(thread: NegotiationThreadRead): string | null {
  const lastMessage = [...thread.messages]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .at(-1);
  return lastMessage?.actor_id ?? null;
}

function hasUnreadSignal(thread: NegotiationThreadRead, actorId: string, selectedThreadId: string): boolean {
  return thread.thread_id !== selectedThreadId && lastVisibleActor(thread) !== null && lastVisibleActor(thread) !== actorId;
}

export function ConversationList({
  actorId,
  query,
  selectedThreadId,
  threads,
  onQueryChange,
  onSelectThread,
  renderTitle,
}: ConversationListProps) {
  return (
    <article className="queue-card negotiation-sidebar">
      <div className="section-heading">
        <div className="stack-sm">
          <p className="eyebrow">Conversations</p>
          <h2>Offer detail</h2>
          <p className="muted measure">Search by listing or counterparty, then open the deal you want to move forward.</p>
        </div>
      </div>

      <div className="field">
        <label className="sr-only" htmlFor="conversation-search">
          Search conversations
        </label>
        <input
          className="ds-input"
          id="conversation-search"
          placeholder="Search listing or counterparty"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <div className="queue-list" role="list" aria-label="Negotiation conversations">
        {threads.map((thread) => {
          const state = deriveNegotiationThreadUiState(thread, actorId);
          const unread = hasUnreadSignal(thread, actorId, selectedThreadId);

          return (
            <button
              className={`thread-list-item conversation-list-item ${thread.thread_id === selectedThreadId ? "is-active" : ""}`}
              key={thread.thread_id}
              type="button"
              onClick={() => onSelectThread(thread.thread_id)}
            >
              <div className="queue-head">
                <strong>{renderTitle(thread)}</strong>
                <div className="pill-row">
                  {unread ? <span className="conversation-unread-dot" aria-label="Unread activity" /> : null}
                  <StatusPill tone={state.statusTone}>{state.statusLabel}</StatusPill>
                </div>
              </div>
              <p className="muted">
                {thread.current_offer_amount} {thread.current_offer_currency}
              </p>
              <p className="muted">Updated {new Date(thread.updated_at).toLocaleString()}</p>
            </button>
          );
        })}
      </div>
    </article>
  );
}
