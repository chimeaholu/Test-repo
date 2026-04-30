"use client";

import { useState } from "react";
import type { IdentitySession } from "@agrodomain/contracts";
import { Button, Input, Checkbox } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";

interface LocationStepProps {
  session: IdentitySession;
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const regionsByCountry: Record<string, string[]> = {
  GH: ["Northern Region", "Upper East Region", "Upper West Region", "Ashanti Region", "Greater Accra Region", "Volta Region", "Western Region", "Eastern Region", "Central Region", "Bono Region"],
  NG: ["Kano", "Lagos", "Oyo", "Kaduna", "Borno", "Plateau", "Ogun", "Rivers", "Cross River", "Benue"],
  JM: ["Saint Andrew", "Saint Catherine", "Clarendon", "Manchester", "Saint Elizabeth", "Westmoreland", "Hanover", "Saint James"],
};

export function LocationStep({ session, data, onUpdate, onContinue, onBack }: LocationStepProps) {
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isRequestingGps, setIsRequestingGps] = useState(false);

  const country = session.actor.country_code;
  const regions = regionsByCountry[country] ?? regionsByCountry.GH;
  const displayRegion = data.region || regions[0];
  const displayDistrict = data.district || "Metropolitan";

  const handleContinue = async () => {
    if (data.gpsEnabled && !data.coordinates) {
      setIsRequestingGps(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        onUpdate({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      } catch {
        setGpsError("GPS permission denied. You can enable it later in Settings.");
        onUpdate({ gpsEnabled: false });
      } finally {
        setIsRequestingGps(false);
      }
    }
    onContinue();
  };

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step-heading">Set your location</h2>
      <p className="onboarding-step-subheading">
        Your location helps shape local alerts, trade context, and support.
      </p>

      {/* Map placeholder */}
      <div className="onboarding-map-view" aria-label="Location map">
        <div className="onboarding-map-placeholder">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 4C16.268 4 10 10.268 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.732-6.268-14-14-14z" fill="var(--color-brand-100)" stroke="var(--color-brand-500)" strokeWidth="2" />
            <circle cx="24" cy="18" r="5" fill="var(--color-brand-600)" />
          </svg>
          <span className="onboarding-map-label">{displayRegion}, {country}</span>
        </div>
      </div>

      {/* Location summary */}
      <div className="onboarding-location-summary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M9 1C5.686 1 3 3.686 3 7c0 5.25 6 10 6 10s6-4.75 6-10c0-3.314-2.686-6-6-6z" fill="var(--color-brand-500)" />
          <circle cx="9" cy="7" r="2" fill="#fff" />
        </svg>
        <div>
          <p className="onboarding-location-primary">{displayRegion}, {displayDistrict}</p>
          {data.community && (
            <p className="onboarding-location-secondary">{data.community}</p>
          )}
        </div>
      </div>

      {/* Edit manually toggle */}
      {!showManualEdit ? (
        <button
          type="button"
          className="onboarding-edit-location-link"
          onClick={() => setShowManualEdit(true)}
        >
          Edit location manually
        </button>
      ) : (
        <div className="onboarding-manual-location">
          <div className="onboarding-field-group">
            <label className="onboarding-field-label" htmlFor="ob-region">Region</label>
            <select
              id="ob-region"
              className="ds-input ds-select"
              value={data.region || regions[0]}
              onChange={(e) => onUpdate({ region: e.target.value })}
            >
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="onboarding-field-group">
            <label className="onboarding-field-label" htmlFor="ob-district">District</label>
            <Input
              id="ob-district"
              placeholder="e.g. Tamale Metropolitan"
              value={data.district}
              onChange={(e) => onUpdate({ district: e.target.value })}
            />
          </div>
          <div className="onboarding-field-group">
            <label className="onboarding-field-label" htmlFor="ob-community">Community (optional)</label>
            <Input
              id="ob-community"
              placeholder="e.g. Kumbungu"
              value={data.community}
              onChange={(e) => onUpdate({ community: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* GPS checkbox */}
      <Checkbox
        label="Use my location for local alerts and planning support (recommended)"
        checked={data.gpsEnabled}
        onChange={(e) => {
          onUpdate({ gpsEnabled: (e.target as HTMLInputElement).checked });
          setGpsError(null);
        }}
      />
      {gpsError && (
        <p className="onboarding-gps-error">{gpsError}</p>
      )}

      {/* Navigation */}
      <div className="onboarding-nav-buttons">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => void handleContinue()}
          loading={isRequestingGps}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
