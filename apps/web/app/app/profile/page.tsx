"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { revokeSchema } from "@/features/identity/schema";
import { InfoList, InsightCallout, SectionHeading, StatusPill, SurfaceCard } from "@/components/ui-primitives";
import { ApiRequestError } from "@/lib/api-types";

export default function ProfilePage() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  // Refresh session on mount to get the latest consent state from the API
  useEffect(() => {
    if (auth.isReady && auth.isAuthenticated) {
      void auth.refreshSession();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isReady, auth.isAuthenticated]);

  const handleRevoke = useCallback(async () => {
    const result = revokeSchema.safeParse({ reason: revokeReason });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Provide a short reason.");
      return;
    }

    setError(null);
    setIsRevoking(true);

    try {
      await auth.revokeConsent(result.data.reason);
      setShowRevokeConfirm(false);
      setRevokeReason("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.apiError.message);
      } else {
        setError("Revocation failed. Please try again.");
      }
    } finally {
      setIsRevoking(false);
    }
  }, [auth, revokeReason]);

  const handleRestore = useCallback(async () => {
    setError(null);
    setIsRestoring(true);

    try {
      await auth.grantConsent({
        policyVersion: "2026.04.w1",
        scopeIds: ["data_collection", "platform_notifications", "audit_logging"],
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.apiError.message);
      } else {
        setError("Consent could not be restored. Please try again.");
      }
    } finally {
      setIsRestoring(false);
    }
  }, [auth]);

  if (!auth.isReady || !auth.isAuthenticated) {
    return null;
  }

  const consent = auth.consent;

  return (
    <>
      <SurfaceCard>
        <SectionHeading
          eyebrow="Consent review"
          title="Consent and permissions"
          body="Revocation propagates immediately. Protected regulated actions remain blocked until a fresh grant is stored with a new timestamp."
        />
        <div className="pill-row">
          <StatusPill tone={consent.consentGranted ? "online" : "degraded"}>
            {consent.consentGranted ? "Consent active" : "Consent review needed"}
          </StatusPill>
          <StatusPill tone="neutral">{auth.role}</StatusPill>
        </div>
      </SurfaceCard>

      <div className="queue-grid">
        <article className="queue-card">
          <SectionHeading eyebrow="Current consent state" title="Consent record" />
          <InfoList
            items={[
              { label: "Consent state", value: consent.consentGranted ? "consent_granted" : "not_granted" },
              { label: "Policy version", value: consent.consentPolicyVersion ?? "pending" },
              { label: "Captured at", value: consent.consentTimestamp ?? "not captured" },
              { label: "Revoked at", value: consent.consentRevokedAt ?? "active" },
              { label: "Scopes", value: consent.consentScopes.join(", ") || "none" },
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

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          {consent.consentGranted ? (
            <>
              {showRevokeConfirm ? (
                <div className="form-stack">
                  <InsightCallout
                    title="Confirm revocation"
                    body="Revoking consent will immediately block all protected regulated actions. You can restore consent later."
                    tone="neutral"
                  />
                  <div className="field">
                    <label htmlFor="reason">Reason for revocation</label>
                    <input
                      id="reason"
                      name="reason"
                      placeholder="Consent needs to be reviewed before more actions."
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      disabled={isRevoking}
                    />
                  </div>
                  <div className="actions-row">
                    <button
                      className="button-secondary"
                      type="button"
                      disabled={isRevoking}
                      aria-busy={isRevoking}
                      onClick={() => void handleRevoke()}
                    >
                      {isRevoking ? "Revoking\u2026" : "Confirm revocation"}
                    </button>
                    <button
                      className="button-ghost"
                      type="button"
                      disabled={isRevoking}
                      onClick={() => {
                        setShowRevokeConfirm(false);
                        setRevokeReason("");
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="detail-stack">
                  <p className="muted">Consent is active. You can revoke it to block protected actions.</p>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => setShowRevokeConfirm(true)}
                  >
                    Revoke consent
                  </button>
                  <p className="muted detail-note">Revocation takes effect immediately for protected actions.</p>
                </div>
              )}
            </>
          ) : (
            <div className="detail-stack">
              <p className="muted">Consent is not active. Restore it to unblock protected actions.</p>
              <button
                className="button-primary"
                type="button"
                disabled={isRestoring}
                aria-busy={isRestoring}
                onClick={() => void handleRestore()}
              >
                {isRestoring ? "Restoring consent\u2026" : "Restore consent"}
              </button>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
