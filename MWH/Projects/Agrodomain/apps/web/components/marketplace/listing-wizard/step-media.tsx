"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import type {
  ListingPhotoDraft,
  ListingWizardDraft,
  ListingWizardFieldErrors,
} from "@/components/marketplace/listing-wizard/types";

const locationOptions = [
  { value: "tamale-northern", label: "Tamale, Northern Region" },
  { value: "kumasi-ashanti", label: "Kumasi, Ashanti Region" },
  { value: "techiman-bono-east", label: "Techiman, Bono East" },
  { value: "ho-volta", label: "Ho, Volta Region" },
];

type StepMediaProps = {
  draft: ListingWizardDraft;
  errors: ListingWizardFieldErrors;
  onChange: <K extends keyof ListingWizardDraft>(field: K, value: ListingWizardDraft[K]) => void;
  onPhotoFiles: (files: FileList | null) => void;
  onRemovePhoto: (photoId: string) => void;
  onRotatePhoto: (photoId: string) => void;
};

function PhotoPreview(props: {
  photo: ListingPhotoDraft;
  onRemove: () => void;
  onRotate: () => void;
}) {
  return (
    <article className="listing-photo-card">
      <div className="listing-photo-frame">
        <img
          alt={props.photo.name}
          className="listing-photo-image"
          src={props.photo.previewUrl}
          style={{ transform: `rotate(${props.photo.rotation}deg)` }}
        />
      </div>
      <div className="stack-sm">
        <strong>{props.photo.name}</strong>
        <p className="muted">{Math.max(1, Math.round(props.photo.size / 1024))} KB</p>
      </div>
      <div className="actions-row">
        <button className="button-ghost" type="button" onClick={props.onRotate}>
          Rotate
        </button>
        <button className="button-ghost" type="button" onClick={props.onRemove}>
          Remove
        </button>
      </div>
    </article>
  );
}

export function ListingWizardStepMedia({
  draft,
  errors,
  onChange,
  onPhotoFiles,
  onRemovePhoto,
  onRotatePhoto,
}: StepMediaProps) {
  return (
    <div className="queue-grid">
      <article className="queue-card">
        <div className="form-stack">
          <div className="field">
            <label htmlFor="listing-photo-upload">Photos</label>
            <Input
              accept="image/*"
              id="listing-photo-upload"
              multiple
              type="file"
              onChange={(event) => onPhotoFiles(event.target.files)}
            />
            <p className="field-help">Add up to 5 photos. Previews are stored with your draft on this device.</p>
            {errors.photos ? <p className="field-error">{errors.photos}</p> : null}
          </div>

          {draft.photos.length > 0 ? (
            <div className="listing-photo-grid">
              {draft.photos.map((photo) => (
                <PhotoPreview
                  key={photo.id}
                  photo={photo}
                  onRemove={() => onRemovePhoto(photo.id)}
                  onRotate={() => onRotatePhoto(photo.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No photos added yet</strong>
              <p className="muted">You can still continue without media, then return when cloud upload is available.</p>
            </div>
          )}

          <div className="field">
            <label htmlFor="listing-location-preset">Region / district</label>
            <select
              className="ds-input"
              id="listing-location-preset"
              value={draft.locationPreset}
              onChange={(event) => onChange("locationPreset", event.target.value)}
            >
              <option value="">Select a preset</option>
              {locationOptions.map((option) => (
                <option key={option.value} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="listing-location-manual">Manual location entry</label>
            <Input
              error={Boolean(errors.location)}
              id="listing-location-manual"
              value={draft.locationManual}
              onChange={(event) => onChange("locationManual", event.target.value)}
            />
            <p className="field-help">Use this when the preset list does not match the exact pickup point.</p>
            {errors.location ? <p className="field-error">{errors.location}</p> : null}
          </div>

          <fieldset className="field">
            <legend>Delivery options</legend>
            <div className="wizard-choice-row" role="radiogroup" aria-label="Delivery options">
              {[
                { value: "pickup", label: "Pickup only" },
                { value: "delivery", label: "Delivery only" },
                { value: "both", label: "Pickup or delivery" },
              ].map((option) => (
                <label className="wizard-choice-card" key={option.value}>
                  <input
                    checked={draft.deliveryMode === option.value}
                    name="delivery-mode"
                    type="radio"
                    value={option.value}
                    onChange={() => onChange("deliveryMode", option.value as ListingWizardDraft["deliveryMode"])}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {errors.deliveryMode ? <p className="field-error">{errors.deliveryMode}</p> : null}
          </fieldset>
        </div>
      </article>

      <article className="queue-card">
        <h3>Readiness check</h3>
        <ul className="summary-list">
          <li>
            <span>Photo count</span>
            <strong>{draft.photos.length} / 5</strong>
          </li>
          <li>
            <span>Location</span>
            <strong>{draft.locationManual || draft.locationPreset || "Pending"}</strong>
          </li>
          <li>
            <span>Delivery</span>
            <strong>{draft.deliveryMode}</strong>
          </li>
        </ul>
      </article>
    </div>
  );
}
