"use client";

import React from "react";
import { useState } from "react";

import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import { identityApi, type ActorSearchItem } from "@/lib/api/identity";
import { walletApi } from "@/lib/api/wallet";

import { RecipientSearch } from "./recipient-search";
import { TransferConfirm } from "./transfer-confirm";

export function SendMoneyFlow(props: {
  availableBalance: number;
  currency: string;
  onCompleted: () => Promise<void> | void;
  senderLabel: string;
  traceId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ActorSearchItem[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ActorSearchItem | null>(null);
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("Transfer from AgroWallet");
  const [step, setStep] = useState<"compose" | "review" | "success">("compose");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    amount: number;
    balance: number;
    currency: string;
    reference: string;
    requestId: string;
    recipientLabel: string;
  } | null>(null);

  const numericAmount = Number(amount);
  const feeAmount = 0;

  async function handleSearch() {
    setIsSearching(true);
    setError(null);
    try {
      const response = await identityApi.searchActors(query, props.traceId);
      setResults(response.data.items);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to search recipients right now.");
    } finally {
      setIsSearching(false);
    }
  }

  function validateComposeStep(): boolean {
    if (!selectedRecipient) {
      setError("Choose a recipient before continuing.");
      return false;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount to send.");
      return false;
    }
    if (numericAmount > props.availableBalance) {
      setError("This amount exceeds the available wallet balance.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleConfirm() {
    if (!selectedRecipient) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const reference = `p2p-${Date.now()}`;
      const response = await walletApi.transferMoney(
        {
          recipient_actor_id: selectedRecipient.actor_id,
          amount: numericAmount,
          currency: props.currency,
          note: note.trim() || undefined,
          reference,
        },
        props.traceId,
      );

      setReceipt({
        amount: numericAmount,
        balance: response.data.wallet.available_balance,
        currency: props.currency,
        reference: response.data.transfer.reference,
        requestId: response.data.request_id,
        recipientLabel: selectedRecipient.display_name,
      });
      setStep("success");
      await props.onCompleted();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send money right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SurfaceCard className="wallet-flow">
      <SectionHeading
        eyebrow="RB-047"
        title="Send money"
        body="Search a platform user, review the transfer, and push funds directly into their wallet ledger."
      />

      {step === "success" && receipt ? (
        <div className="content-stack">
          <div className="pill-row">
            <StatusPill tone="online">Transfer complete</StatusPill>
            <StatusPill tone="neutral">{formatMoney(receipt.amount, receipt.currency)}</StatusPill>
          </div>
          <InfoList
            items={[
              { label: "Recipient", value: receipt.recipientLabel },
              { label: "Updated balance", value: formatMoney(receipt.balance, receipt.currency) },
              { label: "Transfer reference", value: receipt.reference },
              { label: "Support reference", value: receipt.requestId },
            ]}
          />
          <div className="inline-actions">
            <button
              className="button-secondary"
              onClick={() => {
                setStep("compose");
                setReceipt(null);
                setError(null);
                setSelectedRecipient(null);
                setResults([]);
                setQuery("");
              }}
              type="button"
            >
              Send another transfer
            </button>
          </div>
        </div>
      ) : (
        <div className="content-stack">
          {step === "compose" ? (
            <>
              <RecipientSearch
                isSearching={isSearching}
                onQueryChange={setQuery}
                onSearch={() => void handleSearch()}
                onSelect={setSelectedRecipient}
                query={query}
                results={results}
                selectedRecipient={selectedRecipient}
              />

              <div className="wallet-search-row wallet-search-row-single">
                <div className="field">
                  <label htmlFor="wallet-send-amount">Amount</label>
                  <input
                    id="wallet-send-amount"
                    inputMode="decimal"
                    onChange={(event) => setAmount(event.target.value)}
                    value={amount}
                  />
                  <p className="field-help">Available now: {formatMoney(props.availableBalance, props.currency)}</p>
                </div>
                <div className="field">
                  <label htmlFor="wallet-send-note">Reference note</label>
                  <input
                    id="wallet-send-note"
                    onChange={(event) => setNote(event.target.value)}
                    value={note}
                  />
                </div>
              </div>

              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="inline-actions">
                <button
                  className="button-primary"
                  onClick={() => {
                    if (validateComposeStep()) {
                      setStep("review");
                    }
                  }}
                  type="button"
                >
                  Review transfer
                </button>
              </div>
            </>
          ) : null}

          {step === "review" && selectedRecipient ? (
            <>
              <TransferConfirm
                amount={numericAmount}
                currency={props.currency}
                feeAmount={feeAmount}
                note={note}
                recipient={selectedRecipient}
                senderLabel={props.senderLabel}
              />
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="inline-actions">
                <button className="button-primary" disabled={isSubmitting} onClick={() => void handleConfirm()} type="button">
                  {isSubmitting ? "Sending..." : "Confirm transfer"}
                </button>
                <button className="button-ghost" disabled={isSubmitting} onClick={() => setStep("compose")} type="button">
                  Edit transfer
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </SurfaceCard>
  );
}
