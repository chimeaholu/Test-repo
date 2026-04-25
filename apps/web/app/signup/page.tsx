"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useAppState } from "@/components/app-provider";
import { StepIndicator } from "@/components/molecules/step-indicator";
import { Button } from "@/components/ui/button";
import {
  SignupStepIdentity,
  type IdentityData,
} from "@/components/auth/signup-step-identity";
import {
  SignupStepProfile,
  initialProfileData,
  type ProfileData,
} from "@/components/auth/signup-step-profile";
import {
  SignupStepVerification,
  type VerificationData,
} from "@/components/auth/signup-step-verification";

const STEPS = [
  { id: "identity", label: "Identity" },
  { id: "profile", label: "Profile" },
  { id: "verification", label: "Verify" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function validateIdentity(d: IdentityData): Partial<Record<keyof IdentityData, string>> {
  const e: Partial<Record<keyof IdentityData, string>> = {};
  if (!d.role) e.role = "Please select a role.";
  if (!d.fullName || d.fullName.trim().length < 2) e.fullName = "Please enter your full name.";
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Please enter a valid email address.";
  if (!d.phone || d.phone.replace(/\D/g, "").length < 6) e.phone = "Please enter a valid phone number.";
  if (!d.password || d.password.length < 8) e.password = "Password must be at least 8 characters.";
  if (!d.countryCode) e.countryCode = "Please select a country.";
  return e;
}

function validateProfile(role: string, d: ProfileData): Record<string, string> {
  const e: Record<string, string> = {};

  switch (role) {
    case "farmer":
      if (d.crops.length === 0) e.crops = "Please select at least one crop.";
      if (!d.farmSize || Number(d.farmSize) <= 0) e.farmSize = "Please enter your farm size.";
      if (!d.farmingExperience) e.farmingExperience = "Please select your experience level.";
      break;
    case "buyer":
      if (!d.businessName.trim()) e.businessName = "Please enter your business name.";
      if (!d.businessType) e.businessType = "Please select a business type.";
      if (d.commodities.length === 0) e.commodities = "Please select at least one commodity.";
      if (!d.purchaseVolume) e.purchaseVolume = "Please select your purchase volume.";
      break;
    case "cooperative":
      if (!d.cooperativeName.trim()) e.cooperativeName = "Please enter your cooperative name.";
      if (!d.memberCount || Number(d.memberCount) < 2) e.memberCount = "Please enter at least 2 members.";
      if (d.primaryActivities.length === 0) e.primaryActivities = "Please select at least one activity.";
      break;
    case "transporter":
      if (!d.vehicleCount || Number(d.vehicleCount) < 1) e.vehicleCount = "Please enter at least 1 vehicle.";
      if (d.vehicleTypes.length === 0) e.vehicleTypes = "Please select at least one vehicle type.";
      if (!d.coverageArea) e.coverageArea = "Please select your coverage area.";
      break;
    case "finance":
      if (!d.investorType) e.investorType = "Please select your investor type.";
      if (d.investorInterests.length === 0) e.investorInterests = "Please select at least one area of interest.";
      if (!d.investmentRange) e.investmentRange = "Please select your investment range.";
      break;
    case "advisor":
      if (!d.organization.trim()) e.organization = "Please enter your organization.";
      if (d.specializations.length === 0) e.specializations = "Please select at least one specialization.";
      if (!d.yearsExperience) e.yearsExperience = "Please select your years of experience.";
      break;
  }

  return e;
}

function validateVerification(d: VerificationData): Partial<Record<keyof VerificationData, string>> {
  const e: Partial<Record<keyof VerificationData, string>> = {};
  if (!d.otp || d.otp.length !== 6) e.otp = "Please enter the 6-digit verification code.";
  if (!d.termsAccepted) e.termsAccepted = "You must agree to the Terms of Service and Privacy Policy.";
  if (!d.notificationsAccepted) e.notificationsAccepted = "Account notifications consent is required for security purposes.";
  return e;
}

export default function SignUpPage() {
  const { signIn } = useAppState();

  const [currentStep, setCurrentStep] = useState<StepId>("identity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [identityData, setIdentityData] = useState<IdentityData>({
    fullName: "",
    email: "",
    phone: "",
    phonePrefix: "+233",
    password: "",
    role: "",
    countryCode: "",
  });

  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);

  const [verificationData, setVerificationData] = useState<VerificationData>({
    otp: "",
    termsAccepted: false,
    notificationsAccepted: false,
    marketingOptIn: false,
  });

  const [identityErrors, setIdentityErrors] = useState<Partial<Record<keyof IdentityData, string>>>({});
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [verificationErrors, setVerificationErrors] = useState<Partial<Record<keyof VerificationData, string>>>({});

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  function handleContinue() {
    if (currentStep === "identity") {
      const errs = validateIdentity(identityData);
      setIdentityErrors(errs);
      if (Object.keys(errs).length > 0) return;
      setCurrentStep("profile");
    } else if (currentStep === "profile") {
      const errs = validateProfile(identityData.role, profileData);
      setProfileErrors(errs);
      if (Object.keys(errs).length > 0) return;
      setCurrentStep("verification");
    }
  }

  function handleBack() {
    if (currentStep === "profile") setCurrentStep("identity");
    else if (currentStep === "verification") setCurrentStep("profile");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateVerification(verificationData);
    setVerificationErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Map the signup role to the API-compatible ActorRole
      const roleMap: Record<string, string> = {
        farmer: "farmer",
        buyer: "buyer",
        cooperative: "cooperative",
        transporter: "transporter",
        investor: "investor",
        extension_agent: "extension_agent",
      };

      await signIn({
        displayName: identityData.fullName,
        email: identityData.email,
        role: (roleMap[identityData.role] ?? "farmer") as
          | "farmer"
          | "buyer"
          | "cooperative"
          | "transporter"
          | "investor"
          | "extension_agent",
        countryCode: identityData.countryCode,
      });
      // signIn navigates to /onboarding/consent on success
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Account creation failed. Please try again.";
      setSubmitError(
        message === "Failed to fetch"
          ? "Unable to reach the server. Check your connection and try again."
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell" id="main-content">
      <section
        style={{
          maxWidth: 560,
          margin: "48px auto",
          padding: "0 16px",
        }}
      >
        <article
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid var(--color-neutral-200, #e2e0dc)",
            boxShadow: "0 4px 24px rgba(26, 47, 30, 0.06)",
            padding: "48px 40px",
          }}
        >
          <StepIndicator
            steps={[...STEPS]}
            currentStep={currentStep}
            className="ds-steps"
            style-margin-bottom="40px"
          />

          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div style={{ minHeight: 320 }}>
              {currentStep === "identity" && (
                <SignupStepIdentity
                  data={identityData}
                  onChange={setIdentityData}
                  errors={identityErrors}
                />
              )}
              {currentStep === "profile" && (
                <SignupStepProfile
                  role={identityData.role}
                  data={profileData}
                  onChange={setProfileData}
                  errors={profileErrors}
                />
              )}
              {currentStep === "verification" && (
                <SignupStepVerification
                  data={verificationData}
                  onChange={setVerificationData}
                  errors={verificationErrors}
                  phone={identityData.phone}
                  phonePrefix={identityData.phonePrefix}
                />
              )}
            </div>

            {submitError && (
              <p className="ds-form-error" role="alert" style={{ marginTop: 16 }}>
                {submitError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: stepIndex > 0 ? "space-between" : "flex-end",
                marginTop: 32,
                gap: 12,
              }}
            >
              {stepIndex > 0 && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}

              {currentStep === "verification" ? (
                <Button
                  variant="primary"
                  type="submit"
                  loading={isSubmitting}
                  style={{
                    flex: 1,
                    maxWidth: stepIndex > 0 ? undefined : "100%",
                    background: "var(--color-accent-700, #c17b2a)",
                  }}
                >
                  {isSubmitting ? "Creating account\u2026" : "Create My Account"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleContinue}
                  disabled={currentStep === "identity" && !identityData.role}
                >
                  Continue
                </Button>
              )}
            </div>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: "0.9375rem",
              color: "var(--ink-muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/signin"
              style={{
                color: "var(--color-accent-700, #c17b2a)",
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          </p>
        </article>
      </section>
    </main>
  );
}
