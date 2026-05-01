"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { useAppState } from "@/components/app-provider";
import { homeRouteForRole } from "@/features/shell/model";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { LocationStep } from "@/components/onboarding/location-step";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { ConsentStep } from "@/components/onboarding/consent-step";
import { FirstActionStep } from "@/components/onboarding/first-action-step";

const TOTAL_STEPS = 5;
const STORAGE_KEY = "agro_onboarding_step";
const STEP_LABELS = ["Welcome", "Location", "Profile", "Permissions", "First action"] as const;

export interface OnboardingData {
  // Location (step 2)
  region: string;
  district: string;
  community: string;
  gpsEnabled: boolean;
  coordinates: { lat: number; lng: number } | null;
  // Profile (step 3)
  farmName: string;
  crops: string[];
  plantingDate: string;
  // Consent (step 4)
  permissions: Record<string, boolean>;
}

const defaultData: OnboardingData = {
  region: "",
  district: "",
  community: "",
  gpsEnabled: true,
  coordinates: null,
  farmName: "",
  crops: [],
  plantingDate: "",
  permissions: {
    anonymizedData: true,
    priceAlerts: true,
    weatherAlerts: true,
    smsNotifications: true,
    auditTrail: true,
  },
};

export default function OnboardingPage() {
  const { session, isHydrated } = useAppState();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Restore step on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= TOTAL_STEPS) setStep(parsed);
    }
  }, []);

  // Persist step
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  // Portal target for top bar right slot
  useEffect(() => {
    setPortalTarget(document.getElementById("onboarding-topbar-right"));
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (isHydrated && !session) {
      router.replace("/signin");
    }
  }, [isHydrated, session, router]);

  // Pre-fill from session data
  useEffect(() => {
    if (session) {
      setData((prev) => ({
        ...prev,
        region: session.actor.country_code === "GH" ? "Northern Region" : "",
      }));
    }
  }, [session]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goSkip = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const handleComplete = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    if (session) {
      router.push(homeRouteForRole(session.actor.role));
    } else {
      router.push("/");
    }
  }, [router, session]);

  const handleTour = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    if (session) {
      router.push(`${homeRouteForRole(session.actor.role)}?tour=true`);
    }
  }, [router, session]);

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  if (!isHydrated || !session) return null;

  const showSkip = step >= 2 && step <= 4;

  return (
    <>
      {portalTarget &&
        createPortal(
          <div className="onboarding-topbar-meta">
            <span className="onboarding-step-indicator">
              Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}
            </span>
            {showSkip && (
              <button
                type="button"
                className="onboarding-skip-link"
                onClick={goSkip}
              >
                Skip
              </button>
            )}
          </div>,
          portalTarget,
        )}

      <div className="onboarding-card-wrap" id="main-content">
        <div className="onboarding-card">
          <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} labels={[...STEP_LABELS]} />
          <div className="onboarding-card-body">
            {step === 1 && (
              <WelcomeStep session={session} onContinue={goNext} />
            )}
            {step === 2 && (
              <LocationStep
                session={session}
                data={data}
                onUpdate={updateData}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <ProfileStep
                session={session}
                data={data}
                onUpdate={updateData}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <ConsentStep
                data={data}
                onUpdate={updateData}
                onContinue={goNext}
                onBack={goBack}
              />
            )}
            {step === 5 && (
              <FirstActionStep
                session={session}
                onComplete={handleComplete}
                onTour={handleTour}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
