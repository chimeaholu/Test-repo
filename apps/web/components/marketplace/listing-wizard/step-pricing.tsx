"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import type { ListingWizardDraft, ListingWizardFieldErrors } from "@/components/marketplace/listing-wizard/types";

type StepPricingProps = {
  draft: ListingWizardDraft;
  errors: ListingWizardFieldErrors;
  onChange: <K extends keyof ListingWizardDraft>(field: K, value: ListingWizardDraft[K]) => void;
};

export function ListingWizardStepPricing({ draft, errors, onChange }: StepPricingProps) {
  return (
    <div className="queue-grid">
      <article className="queue-card">
        <div className="form-stack">
          <div className="grid-two">
            <div className="field">
              <label htmlFor="listing-price-amount">Price amount</label>
              <Input
                error={Boolean(errors.priceAmount)}
                id="listing-price-amount"
                step="0.01"
                type="number"
                value={draft.priceAmount}
                onChange={(event) => onChange("priceAmount", event.target.value)}
              />
              {errors.priceAmount ? <p className="field-error">{errors.priceAmount}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="listing-price-currency">Currency</label>
              <Input
                error={Boolean(errors.priceCurrency)}
                id="listing-price-currency"
                maxLength={3}
                value={draft.priceCurrency}
                onChange={(event) => onChange("priceCurrency", event.target.value.toUpperCase())}
              />
              {errors.priceCurrency ? <p className="field-error">{errors.priceCurrency}</p> : null}
            </div>
          </div>

          <div className="grid-two">
            <div className="field">
              <label htmlFor="listing-quantity">Quantity (tons)</label>
              <Input
                error={Boolean(errors.quantityTons)}
                id="listing-quantity"
                step="0.1"
                type="number"
                value={draft.quantityTons}
                onChange={(event) => onChange("quantityTons", event.target.value)}
              />
              {errors.quantityTons ? <p className="field-error">{errors.quantityTons}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="listing-moq">Minimum order quantity</label>
              <Input
                error={Boolean(errors.minimumOrderQuantity)}
                id="listing-moq"
                step="0.1"
                type="number"
                value={draft.minimumOrderQuantity}
                onChange={(event) => onChange("minimumOrderQuantity", event.target.value)}
              />
              {errors.minimumOrderQuantity ? <p className="field-error">{errors.minimumOrderQuantity}</p> : null}
            </div>
          </div>

          <fieldset className="field">
            <legend>Pricing type</legend>
            <div className="wizard-choice-row" role="radiogroup" aria-label="Pricing type">
              {[
                { value: "fixed", label: "Fixed price" },
                { value: "negotiable", label: "Negotiable" },
                { value: "auction", label: "Auction" },
              ].map((option) => (
                <label className="wizard-choice-card" key={option.value}>
                  <input
                    checked={draft.pricingType === option.value}
                    name="pricing-type"
                    type="radio"
                    value={option.value}
                    onChange={() => onChange("pricingType", option.value as ListingWizardDraft["pricingType"])}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid-two">
            <div className="field">
              <label htmlFor="listing-availability-start">Availability starts</label>
              <Input
                error={Boolean(errors.availabilityStart)}
                id="listing-availability-start"
                type="date"
                value={draft.availabilityStart}
                onChange={(event) => onChange("availabilityStart", event.target.value)}
              />
              {errors.availabilityStart ? <p className="field-error">{errors.availabilityStart}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="listing-availability-end">Availability ends</label>
              <Input
                error={Boolean(errors.availabilityEnd)}
                id="listing-availability-end"
                type="date"
                value={draft.availabilityEnd}
                onChange={(event) => onChange("availabilityEnd", event.target.value)}
              />
              {errors.availabilityEnd ? <p className="field-error">{errors.availabilityEnd}</p> : null}
            </div>
          </div>
        </div>
      </article>

      <article className="queue-card">
        <h3>Commercial snapshot</h3>
        <ul className="summary-list">
          <li>
            <span>Asking price</span>
            <strong>
              {draft.priceAmount || "0"} {draft.priceCurrency || "---"}
            </strong>
          </li>
          <li>
            <span>Pricing mode</span>
            <strong>{draft.pricingType}</strong>
          </li>
          <li>
            <span>Available volume</span>
            <strong>{draft.quantityTons || "0"} tons</strong>
          </li>
        </ul>
      </article>
    </div>
  );
}
