"use client";

import { useState } from "react";

import { useAppState } from "@/components/app-provider";
import { revokeSchema } from "@/features/identity/schema";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";

export default function ProfilePage() {
  const { session, revokeConsent, grantConsent } = useAppState();
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return null;
  }

  return (
    <>
      <SurfaceCard>
        <SectionHeading
          eyebrow="Consent review"
          title="Consent and permissions"
          body="Revocation propagates immediately. Protected regulated actions remain blocked until a fresh grant is stored with a new timestamp."
        />
        <div className="pill-row">
          <StatusPill tone={session.consent.state === "consent_granted" ? "online" : "degraded"}>
            {session.consent.state === "consent_granted" ? "Consent active" : "Consent review needed"}
          </StatusPill>
          <StatusPill tone="neutral">{session.actor.role}</StatusPill>
        </div>
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading eyebrow="Current response state" title="Consent record" />
          <InfoList
            items={[
              { label: "Consent state", value: session.consent.state },
              { label: "Policy version", value: session.consent.policy_version ?? "pending" },
              { label: "Captured at", value: session.consent.captured_at ?? "not captured" },
              { label: "Revoked at", value: session.consent.revoked_at ?? "active" },
              { label: "Scopes", value: session.consent.scope_ids.join(", ") || "none" },
            ]}
          />
          <InsightCallout
            title="Why this matters"
            body="This route is the fastest way to explain whether a protected action is blocked because of consent state or because of a later workflow policy."
            tone="neutral"
          />
        </article>

        <article className="queue-card">
          <SectionHeading eyebrow="Change consent" title="Update permission state" />
          {session.consent.state === "consent_granted" ? (
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const result = revokeSchema.safeParse({
                  reason: formData.get("reason"),
                });
                if (!result.success) {
                  setError(result.error.issues[0]?.message ?? "Provide a short reason.");
                  return;
                }
                setError(null);
                void revokeConsent(result.data.reason);
              }}
            >
              <div className="field">
                <label htmlFor="reason">Reason for revocation</label>
                <input id="reason" name="reason" placeholder="Consent needs to be reviewed before more actions." />
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="button-secondary" type="submit">
                Revoke consent
              </button>
              <p className="muted detail-note">Revocation takes effect immediately for protected actions.</p>
            </form>
          ) : (
            <div className="detail-stack">
              <p className="muted">Consent is not active. Restore it to unblock protected actions.</p>
              <button
                className="button-primary"
                onClick={() =>
                    void grantConsent({
                      policyVersion: "2026.04.w1",
                      scopeIds: ["identity.core", "workflow.audit", "notifications.delivery"],
                    })
                }
                type="button"
              >
                Restore consent
              </button>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
