"use client";

import { useRef, useState } from "react";
import type { IdentitySession } from "@agrodomain/contracts";
import { Button, Input, Tag } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";
import { roleLabel } from "@/features/shell/model";

interface ProfileStepProps {
  session: IdentitySession;
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const CROP_OPTIONS = [
  "Maize", "Rice", "Soybean", "Cassava", "Yam", "Cocoa", "Plantain",
  "Millet", "Sorghum", "Groundnut", "Cowpea", "Tomato", "Pepper", "Onion",
];

const roleHeadings: Record<string, string> = {
  farmer: "Set up your farm profile",
  buyer: "Set up your buyer profile",
  cooperative: "Set up your cooperative",
  advisor: "Set up your advisory profile",
};

export function ProfileStep({ session, data, onUpdate, onContinue, onBack }: ProfileStepProps) {
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = session.actor.role;
  const heading = roleHeadings[role] ?? `Set up your ${roleLabel(role).toLowerCase()} profile`;

  const addCrop = (crop: string) => {
    if (!data.crops.includes(crop)) {
      onUpdate({ crops: [...data.crops, crop] });
    }
    setShowCropPicker(false);
  };

  const removeCrop = (crop: string) => {
    onUpdate({ crops: data.crops.filter((c) => c !== crop) });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setPhotoError("File must be an image (JPEG, PNG, or WebP) and under 5 MB.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("File must be an image (JPEG, PNG, or WebP) and under 5 MB.");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const availableCrops = CROP_OPTIONS.filter((c) => !data.crops.includes(c));

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step-heading">{heading}</h2>
      <p className="onboarding-step-subheading">
        Add the details that make your workspace useful from day one.
      </p>

      {/* Farm / Business Name */}
      <div className="onboarding-field-group">
        <label className="onboarding-field-label" htmlFor="ob-farm-name">
          {role === "farmer" ? "Farm name (optional)" : "Business name (optional)"}
        </label>
        <Input
          id="ob-farm-name"
          placeholder={role === "farmer" ? "e.g. Mensah Family Farm" : "e.g. Accra Grain Traders"}
          value={data.farmName}
          onChange={(e) => onUpdate({ farmName: e.target.value })}
        />
        <p className="onboarding-field-helper">
          {role === "farmer"
            ? "This helps buyers and partners recognize your work more easily."
            : "This name will appear in the parts of the platform tied to your profile."}
        </p>
      </div>

      {/* Current Season Crops (farmer-specific) */}
      {role === "farmer" && (
        <div className="onboarding-field-group">
          <label className="onboarding-field-label">Current season crops</label>
          <div className="onboarding-crop-tags">
            {data.crops.map((crop) => (
              <Tag key={crop} onRemove={() => removeCrop(crop)}>
                {crop}
              </Tag>
            ))}
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                type="button"
                className="onboarding-add-crop-btn"
                onClick={() => setShowCropPicker(!showCropPicker)}
              >
                + Add crop
              </button>
              {showCropPicker && availableCrops.length > 0 && (
                <div className="onboarding-crop-dropdown">
                  {availableCrops.map((crop) => (
                    <button
                      key={crop}
                      type="button"
                      className="onboarding-crop-option"
                      onClick={() => addCrop(crop)}
                    >
                      {crop}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Planting Date (farmer-specific) */}
      {role === "farmer" && (
        <div className="onboarding-field-group">
          <label className="onboarding-field-label" htmlFor="ob-planting-date">
            Planting date (this season)
          </label>
          <Input
            id="ob-planting-date"
            type="date"
            value={data.plantingDate}
            onChange={(e) => onUpdate({ plantingDate: e.target.value })}
            placeholder="Select date"
          />
        </div>
      )}

      {/* Photo Upload */}
      <div className="onboarding-field-group">
        <label className="onboarding-field-label">
          {role === "farmer" ? "Upload a farm photo (optional)" : "Upload a profile photo (optional)"}
        </label>
        {!photoPreview ? (
          <button
            type="button"
            className="onboarding-upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="24" height="18" rx="3" stroke="var(--color-neutral-400)" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="15" r="3" stroke="var(--color-neutral-400)" strokeWidth="1.5" fill="none" />
              <path d="M8 26l6-8 4 5 4-3 6 6" stroke="var(--color-neutral-400)" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            </svg>
            <span>Drag &amp; drop or click to upload</span>
          </button>
        ) : (
          <div className="onboarding-photo-preview">
            <img src={photoPreview} alt="Farm photo preview" className="onboarding-photo-thumb" />
            <div>
              <p className="onboarding-photo-name">{photoFile?.name}</p>
              <button type="button" className="onboarding-remove-photo" onClick={removePhoto}>
                Remove
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="sr-only"
          aria-label="Upload photo"
        />
        {photoError && <p className="onboarding-field-error">{photoError}</p>}
      </div>

      {/* Navigation */}
      <div className="onboarding-nav-buttons">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
