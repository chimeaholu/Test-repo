"use client";

import React from "react";
import { useState } from "react";

import { InfoList, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { formatMoney } from "@/features/wallet/model";
import { fundApi } from "@/lib/api/fund";
import { type FundInvestmentRecord, type FundOpportunity, toFundInvestmentRecord } from "@/lib/fund";

export function InvestFlow(props: {
  actorId: string;
  availableBalance: number;
  currency: string;
  onCompleted: (record: FundInvestmentRecord) => Promise<void> | void;
  opportunity: FundOpportunity;
  traceId: string;
}) {
  const [amount, setAmount] = useState(String(props.opportunity.minInvestment));
  const [note, setNote] = useState("AgroFund commitment");
  const [step, setStep] = useState<"edit" | "review" | "success">("edit");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<FundInvestmentRecord | null>(null);

  const numericAmount = Number(amount);
  const expectedReturnAmount = Number((numericAmount * (props.opportunity.expectedReturnPct / 100)).toFixed(2));

  function validate(): boolean {
    if (!Number.isFinite(numericAmount) || numericAmount < props.opportunity.minInvestment) {
      setError(`Minimum investment is ${formatMoney(props.opportunity.minInvestment, props.currency)}.`);
      return false;
    }
    if (numericAmount > props.opportunity.maxInvestment) {
      setError(`Maximum ticket is ${formatMoney(props.opportunity.maxInvestment, props.currency)}.`);
      return false;
    }
    if (numericAmount > props.availableBalance) {
      setError("This amount exceeds the available wallet balance.");
      return false;
    }
    setError(null);
    return true;
  }

  async function confirmInvestment() {
    if (!props.opportunity.opportunityId) {
      setError("This fund opportunity is not ready for investment yet.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fundApi.createInvestment({
        actorId: props.actorId,
        countryCode: props.opportunity.listing.country_code,
        input: {
          opportunity_id: props.opportunity.opportunityId,
          amount: numericAmount,
          currency: props.currency,
          note: note.trim() || undefined,
        },
        traceId: props.traceId,
      });
      const record: FundInvestmentRecord = toFundInvestmentRecord(response.data.investment);
      setReceipt(record);
      setStep("success");
      await props.onCompleted(record);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to complete this investment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SurfaceCard>
      <SectionHeading
        eyebrow="Invest now"
        title="Fund this farm from your wallet"
        body="Review the amount, expected return, and timeline before you invest."
      />

      {step === "success" && receipt ? (
        <div className="content-stack">
          <div className="pill-row">
            <StatusPill tone="online">Investment confirmed</StatusPill>
            <StatusPill tone="neutral">{formatMoney(receipt.amount, receipt.currency)}</StatusPill>
          </div>
          <InfoList
            items={[
              { label: "Opportunity", value: props.opportunity.listing.title },
              { label: "Reference", value: receipt.reference },
              { label: "Expected return", value: formatMoney(receipt.expected_return_amount, receipt.currency) },
              { label: "Timeline", value: `${receipt.timeline_months} months` },
            ]}
          />
        </div>
      ) : (
        <div className="content-stack">
          {step === "edit" ? (
            <>
              <div className="field">
                <label htmlFor="fund-invest-amount">Investment amount</label>
                <input id="fund-invest-amount" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
                <p className="field-help">
                  Minimum {formatMoney(props.opportunity.minInvestment, props.currency)} · Maximum {formatMoney(props.opportunity.maxInvestment, props.currency)}
                </p>
              </div>
              <div className="field">
                <label htmlFor="fund-invest-note">Reference note</label>
                <input id="fund-invest-note" onChange={(event) => setNote(event.target.value)} value={note} />
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                className="button-primary"
                onClick={() => {
                  if (validate()) {
                    setStep("review");
                  }
                }}
                type="button"
              >
                Review amount
              </button>
            </>
          ) : null}

          {step === "review" ? (
            <>
              <InfoList
                items={[
                  { label: "Farm", value: props.opportunity.listing.title },
                  { label: "Amount", value: formatMoney(numericAmount, props.currency) },
                  { label: "Expected return", value: formatMoney(expectedReturnAmount, props.currency) },
                  { label: "Timeline", value: `${props.opportunity.timelineMonths} months` },
                ]}
              />
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="inline-actions">
                <button className="button-primary" disabled={isSubmitting} onClick={() => void confirmInvestment()} type="button">
                  {isSubmitting ? "Investing now..." : "Invest now"}
                </button>
                <button className="button-ghost" disabled={isSubmitting} onClick={() => setStep("edit")} type="button">
                  Edit amount
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </SurfaceCard>
  );
}
