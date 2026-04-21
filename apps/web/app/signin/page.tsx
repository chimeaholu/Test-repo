"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useAppState } from "@/components/app-provider";
import { signInSchema } from "@/features/identity/schema";
import { InsightCallout, SectionHeading, StatusPill } from "@/components/ui-primitives";
import { signInCopy } from "@/lib/content/route-copy";

const countries = [
  { code: "GH", label: "Ghana" },
  { code: "NG", label: "Nigeria" },
  { code: "JM", label: "Jamaica" },
] as const;

const roles = [
  { value: "farmer", label: "Farmer" },
  { value: "buyer", label: "Buyer" },
  { value: "cooperative", label: "Cooperative" },
  { value: "advisor", label: "Advisor" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
] as const;

export default function SignInPage() {
  const { signIn } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    setIsInteractive(true);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = signInSchema.safeParse({
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      role: formData.get("role"),
      countryCode: formData.get("countryCode"),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setError(null);
    void signIn(result.data);
  };

  return (
    <main className="page-shell" id="main-content">
      <section className="grid-two">
        <article className="hero-card">
          <div className="pill-row">
            <StatusPill tone="neutral">Identity check</StatusPill>
            <StatusPill tone="degraded">Consent required next</StatusPill>
          </div>
          <h1 className="display-title">{signInCopy.title}</h1>
          <p className="lede">{signInCopy.body}</p>
          <div className="stack-md">
            <InsightCallout
              title="Field-first rule"
              body={signInCopy.fieldRule}
              tone="brand"
            />
            <InsightCallout
              title="Risk rule"
              body={signInCopy.riskRule}
              tone="accent"
            />
          </div>
          <div className="hero-kpi-grid" aria-label="What happens next">
            <article className="hero-kpi">
              <span className="metric-label">Step 1</span>
              <strong>Identity is recorded</strong>
              <p className="muted">Your role, email, and operating country are attached to the active session.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Step 2</span>
              <strong>Consent stays separate</strong>
              <p className="muted">The next route explains what is captured and what remains blocked.</p>
            </article>
            <article className="hero-kpi">
              <span className="metric-label">Step 3</span>
              <strong>Routing happens after review</strong>
              <p className="muted">The workspace opens only after policy capture is complete.</p>
            </article>
          </div>
        </article>

        <article className="panel">
          <SectionHeading
            eyebrow="Identity entry"
            title="Enter your work details"
            body={signInCopy.shellBody}
          />
          <form
            className="form-stack"
            data-interactive={isInteractive ? "true" : "false"}
            onSubmit={handleSubmit}
            aria-describedby="signin-helper"
          >
            <p className="muted" id="signin-helper">
              Use the identity details attached to the work you need to resume. You can review consent before any protected action is enabled.
            </p>
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                name="displayName"
                autoComplete="name"
                aria-describedby="displayName-help"
                minLength={2}
                placeholder="Ama Mensah"
                required
              />
              <p className="field-help" id="displayName-help">
                Use the name your cooperative, buyer group, or field team expects.
              </p>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-describedby="email-help"
                placeholder="ama@example.com"
                required
              />
              <p className="field-help" id="email-help">
                This is used for account recovery, notifications, and route context.
              </p>
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue="farmer" aria-describedby="role-help">
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="field-help" id="role-help">
                Choose the workspace you need today. This determines the protected route you reach after consent.
              </p>
            </div>
            <div className="field">
              <label htmlFor="countryCode">Country pack</label>
              <select id="countryCode" name="countryCode" defaultValue="GH" aria-describedby="country-help">
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
              <p className="field-help" id="country-help">
                Country scope affects policy text, route framing, and operational context.
              </p>
            </div>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="actions-row">
              <button className="button-primary" type="submit">
                Continue to onboarding
              </button>
              <p className="muted detail-note">No protected work is unlocked on this route.</p>
            </div>
          </form>
          <div className="journey-grid compact-grid" aria-label="Route guarantees">
            <article className="journey-card subtle">
              <h3>Visible next step</h3>
              <p className="muted">The route does not skip directly into a workspace. Consent review is always shown next.</p>
            </article>
            <article className="journey-card subtle">
              <h3>Clear accountability</h3>
              <p className="muted">Your session identity is what later connects recovery events, approvals, and audit trails.</p>
            </article>
          </div>
        </article>
      </section>
    </main>
  );
}
