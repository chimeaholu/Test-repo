"use client";

import React from "react";
import { useMemo, useState } from "react";

import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import { walletApi } from "@/lib/api/wallet";

import { BankTransferForm } from "./bank-transfer-form";
import { MobileMoneyForm } from "./mobile-money-form";
import { PaymentMethodSelector, paymentMethodOptions, type WalletPaymentMethod } from "./payment-method-selector";

function validatePhone(countryCode: string, phone: string): boolean {
  const digits = phone.replace(/\D+/g, "");
  if (countryCode.toUpperCase() === "NG") {
    return /^0\d{10}$/.test(digits) || /^234\d{10}$/.test(digits);
  }
  if (countryCode.toUpperCase() === "JM") {
    return /^(876|658)\d{7}$/.test(digits) || /^1?(876|658)\d{7}$/.test(digits);
  }
  return /^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits);
}

function providerLabel(method: WalletPaymentMethod, countryCode: string): string {
  return paymentMethodOptions(countryCode).find((option) => option.id === method)?.label ?? "Mobile Money";
}

export function AddFundsFlow(props: {
  actorId: string;
  countryCode: string;
  currency: string;
  onCompleted: () => Promise<void> | void;
  traceId: string;
}) {
  const [method, setMethod] = useState<WalletPaymentMethod>(
    props.countryCode.toUpperCase() === "JM" ? "bank_transfer" : "mtn_momo",
  );
  const [amount, setAmount] = useState("250");
  const [note, setNote] = useState("Wallet top-up from the AgroWallet funding flow.");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number;
    balance: number;
    currency: string;
    requestId: string;
  } | null>(null);

  const numericAmount = Number(amount);
  const methodLabel = useMemo(() => providerLabel(method, props.countryCode), [method, props.countryCode]);

  async function handleSubmit() {
    const trimmedReference = reference.trim();
    const trimmedPhone = phone.trim();

    if (!Number.isFinite(numericAmount) || numericAmount < 10) {
      setError("Enter an amount of at least 10.");
      return;
    }
    if (numericAmount > 50000) {
      setError("This funding flow supports up to 50,000 per request.");
      return;
    }
    if (method !== "bank_transfer" && !validatePhone(props.countryCode, trimmedPhone)) {
      setError("Enter a valid mobile money number for the selected country.");
      return;
    }
    if (method === "bank_transfer" && trimmedReference.length < 6) {
      setError("Enter the bank transfer reference so the deposit can be verified.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const referenceId =
        method === "bank_transfer"
          ? `bank-${trimmedReference.toUpperCase()}`
          : `${method}-${trimmedPhone.replace(/\D+/g, "")}`;
      const response = await walletApi.fundWallet(
        {
          wallet_actor_id: props.actorId,
          country_code: props.countryCode,
          currency: props.currency,
          amount: numericAmount,
          reference_type: "deposit",
          reference_id: referenceId,
          note: note.trim() || undefined,
          reconciliation_marker: `wallet-fund-${Date.now()}`,
        },
        props.traceId,
        props.actorId,
        props.countryCode,
      );

      setReceipt({
        amount: numericAmount,
        balance: response.data.wallet.total_balance,
        currency: props.currency,
        requestId: response.data.request_id,
      });
      await props.onCompleted();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add funds right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SurfaceCard className="wallet-flow">
      <SectionHeading
        eyebrow="RB-046"
        title="Add funds"
        body="Top up your wallet through mobile money or bank transfer without leaving the AgroWallet workspace."
      />

      {receipt ? (
        <div className="content-stack">
          <div className="pill-row">
            <StatusPill tone="online">Funds added</StatusPill>
            <StatusPill tone="neutral">{formatMoney(receipt.amount, receipt.currency)}</StatusPill>
          </div>
          <InfoList
            items={[
              { label: "Funding method", value: methodLabel },
              { label: "Updated balance", value: formatMoney(receipt.balance, receipt.currency) },
              { label: "Support reference", value: receipt.requestId },
            ]}
          />
          <div className="inline-actions">
            <button
              className="button-secondary"
              onClick={() => {
                setReceipt(null);
                setError(null);
              }}
              type="button"
            >
              Add another deposit
            </button>
          </div>
        </div>
      ) : (
        <div className="content-stack">
          <PaymentMethodSelector countryCode={props.countryCode} onSelect={setMethod} selectedMethod={method} />

          <div className="field">
            <label htmlFor="wallet-add-amount">Amount</label>
            <input
              id="wallet-add-amount"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
            <p className="field-help">Minimum 10. Maximum 50,000 per funding request.</p>
          </div>

          {method === "bank_transfer" ? (
            <BankTransferForm countryCode={props.countryCode} onReferenceChange={setReference} reference={reference} />
          ) : (
            <MobileMoneyForm countryCode={props.countryCode} onPhoneChange={setPhone} phone={phone} providerLabel={methodLabel} />
          )}

          <div className="field">
            <label htmlFor="wallet-add-note">Reference note</label>
            <textarea
              id="wallet-add-note"
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              value={note}
            />
          </div>

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="inline-actions">
            <button className="button-primary" disabled={isSubmitting} onClick={() => void handleSubmit()} type="button">
              {isSubmitting ? "Processing funding..." : method === "bank_transfer" ? "Verify transfer and add funds" : "Confirm mobile money funding"}
            </button>
            {error ? (
              <button className="button-ghost" onClick={() => setError(null)} type="button">
                Retry
              </button>
            ) : null}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
