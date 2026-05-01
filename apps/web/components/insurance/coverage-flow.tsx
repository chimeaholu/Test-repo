"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import {
  calculateInsurancePremium,
  type InsuranceFieldSummary,
  type PurchaseCoverageInput,
} from "@/lib/api/insurance";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

type CoverageFlowProps = {
  availableBalance: number;
  currency: string;
  fields: InsuranceFieldSummary[];
  onPurchase: (input: PurchaseCoverageInput) => Promise<void>;
};

const coverageOptions = [
  { label: "Drought", value: "drought" },
  { label: "Flood", value: "flood" },
  { label: "Pest", value: "pest" },
  { label: "Comprehensive", value: "comprehensive" },
] as const;

const coverageWindowOptions = [
  { label: "Main season (6 months)", value: "Main season 2026" },
  { label: "Dry season (4 months)", value: "Dry season 2026" },
  { label: "Annual cover (12 months)", value: "Annual cover 2026" },
] as const;

export function CoverageFlow({ availableBalance, currency, fields, onPurchase }: CoverageFlowProps) {
  const [fieldId, setFieldId] = useState(fields[0]?.farm_id ?? "");
  const [coverageType, setCoverageType] = useState<PurchaseCoverageInput["coverage_type"]>("comprehensive");
  const [coverageWindowLabel, setCoverageWindowLabel] = useState<string>(coverageWindowOptions[0].value);
  const [coverageAmount, setCoverageAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedField = useMemo(
    () => fields.find((item) => item.farm_id === fieldId) ?? fields[0] ?? null,
    [fieldId, fields],
  );

  useEffect(() => {
    if (fields.length > 0 && !fields.some((item) => item.farm_id === fieldId)) {
      setFieldId(fields[0].farm_id);
    }
  }, [fieldId, fields]);

  useEffect(() => {
    if (!selectedField) {
      return;
    }
    setCoverageAmount(String(Math.round(selectedField.hectares * 320)));
  }, [selectedField]);

  const parsedCoverageAmount = Number(coverageAmount);
  const premiumAmount =
    selectedField && Number.isFinite(parsedCoverageAmount) && parsedCoverageAmount > 0
      ? calculateInsurancePremium({
          coverageAmount: parsedCoverageAmount,
          coverageType,
          hectares: selectedField.hectares,
          riskLevel: selectedField.risk_level,
        })
      : 0;
  const balanceAfterReserve = Math.max(availableBalance - premiumAmount, 0);
  const canSubmit = Boolean(selectedField) && premiumAmount > 0 && availableBalance >= premiumAmount && !isSubmitting;

  async function handleSubmit() {
    if (!selectedField || !Number.isFinite(parsedCoverageAmount) || parsedCoverageAmount <= 0) {
      setError("Select a field and enter a valid coverage amount.");
      return;
    }

    if (availableBalance < premiumAmount) {
      setError("Available wallet balance is too low for this premium.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onPurchase({
        coverage_amount: parsedCoverageAmount,
        coverage_type: coverageType,
        coverage_window_label: coverageWindowLabel,
        field_id: selectedField.farm_id,
        premium_amount: premiumAmount,
      });
      setSuccess(`Coverage activated for ${selectedField.farm_name}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to activate coverage.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="insurance-coverage-card" aria-label="Get coverage">
      <div className="insurance-coverage-header">
        <div>
          <p className="insurance-policy-kicker">Get coverage</p>
          <h3>Protect a live farm field with wallet-linked cover.</h3>
        </div>
        <ShieldCheck size={20} />
      </div>

      {error ? (
        <Alert variant="error">
          <strong>Coverage check failed.</strong>
          <p>{error}</p>
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success">
          <strong>Coverage active.</strong>
          <p>{success}</p>
        </Alert>
      ) : null}

      <div className="insurance-form-grid">
        <label className="field">
          <span>Select field</span>
          <Select
            options={fields.map((field) => ({
              label: `${field.farm_name} · ${field.crop_type} · ${field.hectares} ha`,
              value: field.farm_id,
            }))}
            value={fieldId}
            onChange={(event) => {
              setSuccess(null);
              setFieldId(event.target.value);
            }}
          />
        </label>

        <label className="field">
          <span>Coverage period</span>
          <Select
            options={coverageWindowOptions.map((item) => ({ label: item.label, value: item.value }))}
            value={coverageWindowLabel}
            onChange={(event) => setCoverageWindowLabel(event.target.value)}
          />
        </label>
      </div>

      <div className="field">
        <span>Coverage type</span>
        <RadioGroup
          className="insurance-radio-grid"
          name="coverage-type"
          onChange={(value) => setCoverageType(value as PurchaseCoverageInput["coverage_type"])}
          options={coverageOptions.map((item) => ({ label: item.label, value: item.value }))}
          value={coverageType}
        />
      </div>

      <label className="field">
        <span>Coverage amount</span>
        <Input
          min={200}
          step={50}
          type="number"
          value={coverageAmount}
          onChange={(event) => setCoverageAmount(event.target.value)}
        />
      </label>

      <div className="insurance-coverage-summary">
        <article>
          <span>Premium</span>
          <strong>{formatMoney(premiumAmount, currency)}</strong>
          <p>Stub premium formula uses acreage, risk posture, and cover type.</p>
        </article>
        <article>
          <span>Wallet after reserve</span>
          <strong>{formatMoney(balanceAfterReserve, currency)}</strong>
          <p>
            <Wallet size={14} />
            {formatMoney(availableBalance, currency)} available now
          </p>
        </article>
      </div>

        <Button disabled={!canSubmit} loading={isSubmitting} onClick={handleSubmit} size="lg">
          {isSubmitting ? "Activating coverage..." : "Review and purchase"}
        </Button>
      </section>
  );
}
