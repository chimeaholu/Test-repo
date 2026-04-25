"use client";

import React from "react";

import { Input, Textarea } from "@/components/ui/input";
import type { ListingWizardDraft, ListingWizardFieldErrors } from "@/components/marketplace/listing-wizard/types";

const commodityOptions = [
  "Cassava",
  "Maize",
  "Rice",
  "Sorghum",
  "Millet",
  "Soybean",
  "Cocoa",
  "Plantain",
  "Tomato",
  "Pepper",
];

type StepBasicProps = {
  draft: ListingWizardDraft;
  errors: ListingWizardFieldErrors;
  onChange: <K extends keyof ListingWizardDraft>(field: K, value: ListingWizardDraft[K]) => void;
};

export function ListingWizardStepBasic({ draft, errors, onChange }: StepBasicProps) {
  return (
    <div className="content-stack">
      <div className="queue-grid">
        <article className="queue-card">
          <div className="form-stack">
            <div className="field">
              <label htmlFor="listing-title">Listing title</label>
              <Input
                error={Boolean(errors.title)}
                id="listing-title"
                value={draft.title}
                onChange={(event) => onChange("title", event.target.value)}
              />
              {errors.title ? <p className="field-error">{errors.title}</p> : null}
            </div>

            <div className="grid-two">
              <div className="field">
                <label htmlFor="listing-commodity">Commodity</label>
                <Input
                  error={Boolean(errors.commodity)}
                  id="listing-commodity"
                  list="commodity-options"
                  value={draft.commodity}
                  onChange={(event) => onChange("commodity", event.target.value)}
                />
                <datalist id="commodity-options">
                  {commodityOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                {errors.commodity ? <p className="field-error">{errors.commodity}</p> : null}
              </div>

              <div className="field">
                <label htmlFor="listing-variety-grade">Variety / grade</label>
                <Input
                  error={Boolean(errors.varietyGrade)}
                  id="listing-variety-grade"
                  value={draft.varietyGrade}
                  onChange={(event) => onChange("varietyGrade", event.target.value)}
                />
                {errors.varietyGrade ? <p className="field-error">{errors.varietyGrade}</p> : null}
              </div>
            </div>

            <div className="field">
              <label htmlFor="listing-description">Description</label>
              <Textarea
                error={Boolean(errors.description)}
                id="listing-description"
                rows={6}
                value={draft.description}
                onChange={(event) => onChange("description", event.target.value)}
              />
              <p className="field-help">Explain quality, packaging, readiness, and what makes this lot valuable.</p>
              {errors.description ? <p className="field-error">{errors.description}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="listing-category">Category</label>
              <Input
                error={Boolean(errors.category)}
                id="listing-category"
                value={draft.category}
                onChange={(event) => onChange("category", event.target.value)}
              />
              <p className="field-help">Auto-suggested from the commodity, but you can refine it.</p>
              {errors.category ? <p className="field-error">{errors.category}</p> : null}
            </div>
          </div>
        </article>

        <article className="queue-card">
          <h3>Buyer-facing guidance</h3>
          <ul className="summary-list">
            <li>
              <span>Use a specific title</span>
              <strong>Commodity + quality + state</strong>
            </li>
            <li>
              <span>Describe proof</span>
              <strong>Packaging, moisture, readiness</strong>
            </li>
            <li>
              <span>Keep category tidy</span>
              <strong>Helps feed organization later</strong>
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
}
