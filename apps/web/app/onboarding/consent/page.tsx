"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth-context";
import { consentSchema } from "@/features/identity/schema";
import { InfoList, InsightCallout, SectionHeading, StatusPill } from "@/components/ui-primitives";
import { consentCopy } from "@/lib/content/route-copy";
import { homeRouteForRole } from "@/features/shell/model";
import { ApiRequestError } from "@/lib/api-types";

const scopeOptions = [
  { value: "data_collection" as const, label: "Data collection and processing" },
  { value: "platform_notifications" as const, label: "Platform notifications and recovery prompts" },
  { value: "audit_logging" as const, label: "Audit logging and regulated operations" },
] as const;

export default function ConsentPage() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    setIsInteractive(true);
  }, []);

  // If consent is already granted, redirect to role-appropriate dashboard
  useEffect(() => {
    if (auth.isReady && auth.isAuthenticated && auth.consent.consentGranted) {
      router.replace(homeRouteForRole(auth.role));
    }
  }, [auth.isReady, auth.isAuthenticated, auth.consent.consentGranted, auth.role, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const scopeIds = formData.getAll("scopeIds").map((value) => String(value));
    const result = consentSchema.safeParse({
      accepted: formData.get("accepted") === "on",
      policyVersion: consentCopy.policyVersion,
      scopeIds,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Review the consent form and try again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await auth.grantConsent({
        policyVersion: result.data.policyVersion,
        scopeIds: result.data.scopeIds,
      });

      // Redirect to role-appropriate dashboard after successful consent
      if (auth.role) {
        router.push(homeRouteForRole(auth.role));
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.apiError.message);
      } else {
        setError("Consent could not be recorded. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show nothing until the auth provider is ready
  if (!auth.isReady) {
    return null;
  }

  // Redirect to sign in if not authenticated
  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <main className="page-shell" id="main-content">
      <section className="grid-two">
        <article className="panel">
          <SectionHeading
            eyebrow={consentCopy.onboardingEyebrow}
            title="Review access before the workspace opens"
            body={consentCopy.onboardingBody}
          />
          <div className="pill-row">
            <StatusPill tone="degraded">Protected actions locked</StatusPill>
            <StatusPill tone="neutral">Policy {consentCopy.policyVersion}</StatusPill>
          </div>
          <ol className="timeline" aria-label="Onboarding steps">
            <li>
              <span className="timeline-marker done" />
              <div>
                <strong>Identity confirmed</strong>
                <p className="muted">{consentCopy.identityLoadedBody}</p>
              </div>
            </li>
            <li>
              <span className="timeline-marker current" />
              <div>
                <strong>Consent review</strong>
                <p className="muted">
                  Regulated actions stay blocked until consent is captured with the policy version and timestamp.
                </p>
              </div>
            </li>
            <li>
              <span className="timeline-marker" />
              <div>
                <strong>Workspace access</strong>
                <p className="muted">{consentCopy.accessBody}</p>
              </div>
            </li>
          </ol>
          <InsightCallout
            title="Plain-language rule"
            body={consentCopy.plainLanguageRule}
            tone="brand"
          />
          <div className="hero-kpi-grid" aria-label="Consent outcomes">
            <article className="hero-kpi">
              <span className="metric-label">Recorded immediately</span>
              <strong>Policy version and capture time</strong>
              <p className="muted">The consent record becomes part of the active session state.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Still enforced later</span>
              <strong>Server-side policy checks</strong>
              <p className="muted">Granting consent does not bypass subsequent permission or workflow checks.</p>
            </article>
          </div>
        </article>

        <article className="panel">
          <SectionHeading
            eyebrow="Consent details"
            title="Choose the permissions you approve"
            body={consentCopy.contractBody}
          />
          <InfoList
            items={[
              { label: "Policy version", value: consentCopy.policyVersion },
              { label: "Channel", value: "pwa" },
              { label: "Country", value: auth.countryCode ?? "pending" },
              { label: "Role", value: auth.role ?? "pending" },
            ]}
          />
          <div className="journey-grid compact-grid" aria-label="Scope explanation">
            <article className="journey-card subtle">
              <h3>Data collection scope</h3>
              <p className="muted">Needed to collect and process operational data for your workspace, including session state and activity records.</p>
            </article>
            <article className="journey-card subtle">
              <h3>Notifications scope</h3>
              <p className="muted">Needed to send recovery prompts, channel handoff advice, and platform notifications.</p>
            </article>
            <article className="journey-card subtle">
              <h3>Audit logging scope</h3>
              <p className="muted">Needed where regulated actions, approvals, or evidence retention apply.</p>
            </article>
          </div>
          <form
            className="form-stack"
            data-interactive={isInteractive ? "true" : "false"}
            onSubmit={(e) => void handleSubmit(e)}
          >
            <fieldset className="fieldset checkbox-list" disabled={isSubmitting}>
              <legend>Select the consent scopes you accept</legend>
              {scopeOptions.map((scope) => (
                <label className="checkbox-item" key={scope.value}>
                  <input
                    defaultChecked={scope.value !== "platform_notifications"}
                    name="scopeIds"
                    type="checkbox"
                    value={scope.value}
                  />
                  <span>
                    <strong>{scope.label}</strong>
                    <span className="helper-inline">
                      {scope.value === "data_collection"
                        ? "Needed to load the correct workspace and process operational data."
                        : scope.value === "audit_logging"
                          ? "Needed to log regulated actions and keep audit history intact."
                          : "Needed to send recovery prompts and channel handoff advice."}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="checkbox-item">
              <input name="accepted" type="checkbox" disabled={isSubmitting} />
              <span>I confirm this consent text can be recorded with its policy version and capture time.</span>
            </label>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="actions-row">
              <button
                className="button-primary"
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Granting consent\u2026" : "Grant consent"}
              </button>
              <Link className="button-ghost" href="/signin">
                Back to sign in
              </Link>
            </div>
            <p className="muted detail-note">If consent is not granted, protected actions remain blocked and the workspace will not open.</p>
          </form>
        </article>
      </section>
    </main>
  );
}
