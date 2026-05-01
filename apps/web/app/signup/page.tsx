"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, MapPinned, ShieldCheck, Sprout } from "lucide-react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicNav } from "@/components/public/public-nav";
import { StepIndicator } from "@/components/molecules/step-indicator";
import { Button } from "@/components/ui/button";
import { identityApi } from "@/lib/api/identity";
import { createTraceId, roleLabel } from "@/features/shell/model";
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
  { id: "role-country", label: "Role and country" },
  { id: "account", label: "Account details" },
  { id: "profile", label: "Working profile" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function validateRoleCountry(d: IdentityData): Partial<Record<keyof IdentityData, string>> {
  const errors: Partial<Record<keyof IdentityData, string>> = {};
  if (!d.role) errors.role = "Please select a role.";
  if (!d.countryCode) errors.countryCode = "Please select a country.";
  return errors;
}

function validateAccount(d: IdentityData): Partial<Record<keyof IdentityData, string>> {
  const errors: Partial<Record<keyof IdentityData, string>> = {};
  if (!d.fullName || d.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.email = "Please enter a valid email address.";
  if (!d.phone || d.phone.replace(/\D/g, "").length < 6) errors.phone = "Please enter a valid phone number.";
  if (!d.password || d.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}

function validateProfile(role: string, d: ProfileData): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (role) {
    case "farmer":
      if (d.crops.length === 0) errors.crops = "Please select at least one crop.";
      if (!d.farmSize || Number(d.farmSize) <= 0) errors.farmSize = "Please enter your farm size.";
      if (!d.farmingExperience) errors.farmingExperience = "Please select your experience level.";
      break;
    case "buyer":
      if (!d.businessName.trim()) errors.businessName = "Please enter your business name.";
      if (!d.businessType) errors.businessType = "Please select a business type.";
      if (d.commodities.length === 0) errors.commodities = "Please select at least one commodity.";
      if (!d.purchaseVolume) errors.purchaseVolume = "Please select your purchase volume.";
      break;
    case "cooperative":
      if (!d.cooperativeName.trim()) errors.cooperativeName = "Please enter your cooperative name.";
      if (!d.memberCount || Number(d.memberCount) < 2) errors.memberCount = "Please enter at least 2 members.";
      if (d.primaryActivities.length === 0) errors.primaryActivities = "Please select at least one activity.";
      break;
    case "transporter":
      if (!d.vehicleCount || Number(d.vehicleCount) < 1) errors.vehicleCount = "Please enter at least 1 vehicle.";
      if (d.vehicleTypes.length === 0) errors.vehicleTypes = "Please select at least one vehicle type.";
      if (!d.coverageArea) errors.coverageArea = "Please select your coverage area.";
      break;
    case "investor":
      if (!d.investorType) errors.investorType = "Please select your investor type.";
      if (d.investorInterests.length === 0) errors.investorInterests = "Please select at least one area of interest.";
      if (!d.investmentRange) errors.investmentRange = "Please select your investment range.";
      break;
    case "extension_agent":
      if (!d.organization.trim()) errors.organization = "Please enter your organization.";
      if (d.specializations.length === 0) errors.specializations = "Please select at least one specialization.";
      if (!d.yearsExperience) errors.yearsExperience = "Please select your years of experience.";
      break;
  }

  return errors;
}

function validateVerification(d: VerificationData): Partial<Record<keyof VerificationData, string>> {
  const errors: Partial<Record<keyof VerificationData, string>> = {};
  if (!d.termsAccepted) errors.termsAccepted = "You must agree to the Terms of Service and Privacy Policy.";
  if (!d.notificationsAccepted) {
    errors.notificationsAccepted = "Please allow essential account updates so we can protect your account and key activity.";
  }
  return errors;
}

export default function SignUpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepId>("role-country");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const stepIndex = STEPS.findIndex((step) => step.id === currentStep);
  const selectedCountry =
    identityData.countryCode === "GH" ? "Ghana" : identityData.countryCode === "NG" ? "Nigeria" : identityData.countryCode === "JM" ? "Jamaica" : "Pending";
  const selectedRole = identityData.role ? roleLabel(identityData.role as never) : "Pending";

  function handleContinue() {
    if (currentStep === "role-country") {
      const errors = validateRoleCountry(identityData);
      setIdentityErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      setCurrentStep("account");
      return;
    }

    if (currentStep === "account") {
      const errors = validateAccount(identityData);
      setIdentityErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      setCurrentStep("profile");
      return;
    }

    if (currentStep === "profile") {
      const errors = validateProfile(identityData.role, profileData);
      setProfileErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      setCurrentStep("review");
    }
  }

  function handleBack() {
    if (currentStep === "account") setCurrentStep("role-country");
    else if (currentStep === "profile") setCurrentStep("account");
    else if (currentStep === "review") setCurrentStep("profile");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateVerification(verificationData);
    setVerificationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await identityApi.registerPasswordAccount(
        {
          displayName: identityData.fullName,
          email: identityData.email,
          phoneNumber: `${identityData.phonePrefix}${identityData.phone}`.replace(/\s+/g, ""),
          password: identityData.password,
          role: identityData.role as IdentityData["role"] & (
            | "farmer"
            | "buyer"
            | "cooperative"
            | "transporter"
            | "investor"
            | "extension_agent"
          ),
          countryCode: identityData.countryCode,
        },
        createTraceId("signup-password"),
      );
      setSubmitSuccess("Account created. Redirecting into setup.");
      router.push("/onboarding/consent");
    } catch {
      setSubmitError("Account setup could not be completed. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pub-page">
      <PublicNav />

      <main className="pub-signin-bg pub-entry-main" id="main-content">
        <div className="pub-entry-grid">
          <section className="pub-entry-hero">
            <p className="pub-overline">Create your account</p>
            <h1 className="pub-display pub-display-light">Set up your Agrodomain workspace</h1>
            <p className="pub-copy pub-copy-light">
              Choose your role, add your details, and continue into setup for the work you do.
            </p>
            <div className="pub-entry-benefits">
              <article className="pub-entry-benefit">
                <MapPinned size={18} />
                <div>
                  <strong>Role and country first</strong>
                  <p>Your country helps us show the right language, currency, and local tools.</p>
                </div>
              </article>
              <article className="pub-entry-benefit">
                <ShieldCheck size={18} />
                <div>
                  <strong>Setup before workspace</strong>
                  <p>You&apos;ll continue into setup before your workspace opens.</p>
                </div>
              </article>
              <article className="pub-entry-benefit">
                <Sprout size={18} />
                <div>
                  <strong>Built for real work</strong>
                  <p>The account opens into the role path that matches how you already work.</p>
                </div>
              </article>
            </div>
          </section>

          <article className="pub-entry-card">
            <StepIndicator
              steps={[...STEPS]}
              currentStep={currentStep}
              className="ds-steps"
            />

            <p className="pub-auth-kicker">Create your account</p>
            <h2 className="pub-entry-panel-title">{STEPS[stepIndex]?.label}</h2>
            <p className="pub-entry-panel-copy">
              {currentStep === "role-country" && "Pick the role that matches how you use the platform today."}
              {currentStep === "account" && "Add the account details you&apos;ll use to get back in."}
              {currentStep === "profile" && "Add the working details that make the platform useful from day one."}
              {currentStep === "review" && "Check your details before your account is created."}
            </p>

            <form onSubmit={(event) => void handleSubmit(event)} noValidate>
              <div className="pub-signup-steps">
                {currentStep === "role-country" && (
                  <SignupStepIdentity
                    data={identityData}
                    onChange={setIdentityData}
                    errors={identityErrors}
                    mode="role-country"
                  />
                )}
                {currentStep === "account" && (
                  <SignupStepIdentity
                    data={identityData}
                    onChange={setIdentityData}
                    errors={identityErrors}
                    mode="account"
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
                {currentStep === "review" && (
                  <SignupStepVerification
                    data={verificationData}
                    onChange={setVerificationData}
                    errors={verificationErrors}
                    phone={identityData.phone}
                    phonePrefix={identityData.phonePrefix}
                    summary={[
                      { label: "Role", value: selectedRole },
                      { label: "Country", value: selectedCountry },
                      { label: "Name", value: identityData.fullName || "Pending" },
                      { label: "Email", value: identityData.email || "Pending" },
                    ]}
                  />
                )}
              </div>

              {submitError ? (
                <p className="ds-form-error" role="alert" style={{ marginTop: 16 }}>
                  {submitError}
                </p>
              ) : null}

              {submitSuccess ? (
                <p className="pub-form-success" role="status">
                  {submitSuccess}
                </p>
              ) : null}

              <div className="pub-signup-actions">
                {stepIndex > 0 ? (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                ) : null}

                {currentStep === "review" ? (
                  <Button
                    variant="primary"
                    type="submit"
                    loading={isSubmitting}
                    className="pub-signup-submit"
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleContinue}
                    className="pub-signup-submit"
                  >
                    Continue
                  </Button>
                )}
              </div>
            </form>

            <div className="pub-entry-support">
              <Link href="/signin" className="pub-inline-text-link">
                Already have an account? Sign in
              </Link>
              <Link href="/preview" className="pub-inline-text-link pub-inline-text-link-strong">
                View guided preview
                <ArrowRight size={15} />
              </Link>
              <p className="pub-entry-helper-line">
                Review helper: You&apos;ll continue into setup before your workspace opens.
              </p>
            </div>
          </article>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
