"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { BellRing, ScrollText, ShieldCheck } from "lucide-react";

import { useAppState } from "@/components/app-provider";
import { consentSchema } from "@/features/identity/schema";
import { consentCopy } from "@/lib/content/route-copy";

const requiredScopes = [
  {
    value: "identity.core",
    title: "Keep your account secure",
    body: "This helps us confirm your identity and keep the right workspace attached to your account.",
    icon: ShieldCheck,
  },
  {
    value: "workflow.audit",
    title: "Protect important actions",
    body: "This keeps key trade, payment, and review actions properly recorded.",
    icon: ScrollText,
  },
  {
    value: "notifications.delivery",
    title: "Send essential updates",
    body: "This lets us notify you when money moves, offers change, or review is needed.",
    icon: BellRing,
  },
] as const;

export default function ConsentPage() {
  const { ensureConsentPending, grantConsent, isHydrated, session } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isHydrated && session?.consent.state === "identified") {
      ensureConsentPending();
    }
  }, [ensureConsentPending, isHydrated, session]);

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
      setError(result.error.issues[0]?.message ?? "Please review the permissions before you continue.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await grantConsent({
        policyVersion: result.data.policyVersion,
        scopeIds: result.data.scopeIds,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "We could not record your permissions.";
      setError(
        message === "Failed to fetch"
          ? "We could not reach the service. Check your connection and try again."
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pub-route-main onboarding-consent-main" id="main-content">
      <section className="pub-route-section">
        <div className="pub-section-shell onboarding-consent-shell">
          <div className="onboarding-consent-copy">
            <p className="pub-overline">Before you continue</p>
            <h1 className="pub-display">Review the permissions that keep your workspace working</h1>
            <p className="pub-copy pub-copy-lg">
              Agrodomain needs a few essential permissions to secure your account,
              record protected actions, and send important updates.
            </p>
            <div className="pub-card-grid pub-card-grid-three">
              {requiredScopes.map((scope) => {
                const Icon = scope.icon;
                return (
                  <article key={scope.value} className="pub-card pub-card-accent">
                    <span className="pub-icon-badge">
                      <Icon size={20} />
                    </span>
                    <h2>{scope.title}</h2>
                    <p>{scope.body}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <form className="onboarding-consent-form" onSubmit={(event) => void handleSubmit(event)}>
            {requiredScopes.map((scope) => (
              <input key={scope.value} name="scopeIds" type="hidden" value={scope.value} />
            ))}

            <div className="pub-card pub-card-proof">
              <h2>You stay in control</h2>
              <p>
                These permissions support how the platform works. They do not turn
                your account into a public profile or share private information outside the platform.
              </p>
            </div>

            <div className="pub-review-list">
              <div className="pub-review-item">
                <span>Role</span>
                <strong>{session?.actor.role ?? "Pending"}</strong>
              </div>
              <div className="pub-review-item">
                <span>Country</span>
                <strong>{session?.actor.country_code ?? "Pending"}</strong>
              </div>
              <div className="pub-review-item">
                <span>Reference</span>
                <strong>{consentCopy.policyVersion}</strong>
              </div>
            </div>

            <label className="checkbox-item pub-checkbox-item">
              <input name="accepted" type="checkbox" disabled={isSubmitting} />
              <span>I understand these permissions and want to continue into my workspace.</span>
            </label>

            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="pub-cta-row">
              <button
                className="button-primary"
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Accept and continue"}
              </button>
              <Link className="button-ghost" href="/signin">
                Review later
              </Link>
            </div>

            <p className="pub-copy pub-copy-sm">
              Without these permissions, your workspace will stay locked.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
