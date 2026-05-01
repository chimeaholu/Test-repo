"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck, Smartphone, Sprout } from "lucide-react";

import { PublicNav } from "@/components/public/public-nav";
import { useAppState } from "@/components/app-provider";
import {
  magicLinkSchema,
  magicLinkVerifySchema,
  passwordSignInSchema,
} from "@/features/identity/schema";

const countries = [
  { code: "GH", label: "Ghana" },
  { code: "NG", label: "Nigeria" },
  { code: "JM", label: "Jamaica" },
] as const;

type MagicLinkChallengeState = {
  challengeId: string;
  maskedTarget: string;
  expiresAt: string;
  previewCode: string | null;
};

function resolveAuthError(method: "magic_link" | "password", error: unknown): string {
  const message = error instanceof Error ? error.message : "Sign-in could not be completed.";
  if (message === "Failed to fetch") {
    return "We could not reach the service. Check your connection and try again.";
  }
  if (message === "request_failed") {
    return method === "magic_link"
      ? "Verification codes are not available from this workspace right now. Use your password or contact support."
      : "Password sign-in is not available from this workspace right now. Request a code or contact support.";
  }
  if (message === "identity_account_not_found") {
    return "We could not find an account for those details.";
  }
  if (message === "invalid_credentials") {
    return "The password or identifier you entered is incorrect.";
  }
  if (message === "magic_link_invalid") {
    return "That verification code is not valid.";
  }
  if (message === "magic_link_expired") {
    return "That verification code has expired. Request a new one.";
  }
  return message;
}

export default function SignInPage() {
  const { requestMagicLink, signInWithPassword, verifyMagicLink } = useAppState();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next");
  const [method, setMethod] = useState<"password" | "code">("password");
  const [isInteractive, setIsInteractive] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [magicLinkSuccess, setMagicLinkSuccess] = useState<string | null>(null);
  const [magicLinkChallenge, setMagicLinkChallenge] = useState<MagicLinkChallengeState | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false);

  useEffect(() => {
    setIsInteractive(true);
  }, []);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = passwordSignInSchema.safeParse({
      identifier: formData.get("passwordIdentifier"),
      password: formData.get("password"),
      countryCode: formData.get("passwordCountryCode"),
    });

    if (!result.success) {
      setPasswordError(result.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setPasswordError(null);
    setIsPasswordSubmitting(true);
    try {
      await signInWithPassword({ ...result.data, redirectTo });
    } catch (error) {
      setPasswordError(resolveAuthError("password", error));
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (magicLinkChallenge) {
      const verifyResult = magicLinkVerifySchema.safeParse({
        verificationCode: formData.get("verificationCode"),
      });

      if (!verifyResult.success) {
        setMagicLinkError(verifyResult.error.issues[0]?.message ?? "Enter the verification code.");
        return;
      }

      setMagicLinkError(null);
      setIsMagicLinkSubmitting(true);
      try {
        await verifyMagicLink({
          challengeId: magicLinkChallenge.challengeId,
          verificationCode: verifyResult.data.verificationCode,
          redirectTo,
        });
      } catch (error) {
        setMagicLinkError(resolveAuthError("magic_link", error));
      } finally {
        setIsMagicLinkSubmitting(false);
      }
      return;
    }

    const requestResult = magicLinkSchema.safeParse({
      identifier: formData.get("magicLinkIdentifier"),
      countryCode: formData.get("magicLinkCountryCode"),
    });

    if (!requestResult.success) {
      setMagicLinkError(requestResult.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setMagicLinkError(null);
    setMagicLinkSuccess(null);
    setIsMagicLinkSubmitting(true);
    try {
      const challenge = await requestMagicLink(requestResult.data);
      setMagicLinkChallenge({
        challengeId: challenge.challengeId,
        maskedTarget: challenge.maskedTarget,
        expiresAt: challenge.expiresAt,
        previewCode: challenge.previewCode,
      });
      setMagicLinkSuccess(
        challenge.previewCode
          ? `Your sign-in code is ready for ${challenge.maskedTarget}. Enter it below to continue.`
          : `We sent a sign-in code to ${challenge.maskedTarget}. Enter it below to continue.`,
      );
      setMethod("code");
    } catch (error) {
      setMagicLinkError(resolveAuthError("magic_link", error));
    } finally {
      setIsMagicLinkSubmitting(false);
    }
  }

  return (
    <div className="pub-page">
      <PublicNav />

      <main id="main-content" className="pub-signin-bg pub-entry-main">
        <div className="pub-entry-grid">
          <section className="pub-entry-hero">
            <p className="pub-overline">Welcome back</p>
            <h1 className="pub-display pub-display-light">Sign in to your Agrodomain account</h1>
            <p className="pub-copy pub-copy-light">
              Use your password or get a verification code to continue into your workspace.
            </p>
            <div className="pub-chip-row">
              <span className="pub-chip pub-chip-light">Nigeria and Ghana ready</span>
              <span className="pub-chip pub-chip-light">Role-based workspaces</span>
              <span className="pub-chip pub-chip-light">Secure account access</span>
            </div>
            <div className="pub-entry-benefits">
              <article className="pub-entry-benefit">
                <Sprout size={18} />
                <div>
                  <strong>Continue where you left off</strong>
                  <p>Saved work, recent market actions, and alerts stay connected to your account.</p>
                </div>
              </article>
              <article className="pub-entry-benefit">
                <ShieldCheck size={18} />
                <div>
                  <strong>Protected account flow</strong>
                  <p>Essential permissions still run before protected work opens.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="pub-entry-card">
            <p className="pub-auth-kicker">Choose how to sign in</p>
            <div className="pub-auth-tabs" role="tablist" aria-label="Sign-in methods">
              <button
                className="pub-auth-tab"
                data-active={method === "password" || undefined}
                role="tab"
                type="button"
                aria-selected={method === "password"}
                onClick={() => setMethod("password")}
              >
                Password
              </button>
              <button
                className="pub-auth-tab"
                data-active={method === "code" || undefined}
                role="tab"
                type="button"
                aria-selected={method === "code"}
                onClick={() => setMethod("code")}
              >
                Verification code
              </button>
            </div>

            {method === "password" ? (
              <form method="post" className="pub-auth-panel pub-auth-panel-single" onSubmit={(event) => void handlePasswordSubmit(event)}>
                <div className="pub-auth-panel-head">
                  <h2>Password</h2>
                  <p>Use the password you created for this account.</p>
                </div>

                <label className="pub-form-label" htmlFor="passwordCountryCode">Country</label>
                <div className="pub-select-wrapper">
                  <select id="passwordCountryCode" name="passwordCountryCode" className="pub-select" defaultValue="GH" disabled={!isInteractive || isPasswordSubmitting}>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>{country.label}</option>
                    ))}
                  </select>
                  <span className="pub-select-chevron" aria-hidden="true">▾</span>
                </div>

                <label className="pub-form-label" htmlFor="passwordIdentifier">Email or phone number</label>
                <div className="pub-input-wrapper">
                  <input
                    id="passwordIdentifier"
                    name="passwordIdentifier"
                    type="text"
                    className="pub-input"
                    autoComplete="username"
                    placeholder="e.g. ama@email.com or +233241234567"
                    aria-invalid={passwordError ? "true" : "false"}
                    disabled={!isInteractive || isPasswordSubmitting}
                    required
                    data-error={passwordError ? "true" : undefined}
                  />
                </div>

                <label className="pub-form-label" htmlFor="password">Password</label>
                <div className="pub-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="pub-input"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={passwordError ? "true" : "false"}
                    disabled={!isInteractive || isPasswordSubmitting}
                    required
                    data-error={passwordError ? "true" : undefined}
                  />
                </div>

                {passwordError ? (
                  <p className="pub-field-error" role="alert">{passwordError}</p>
                ) : (
                  <p className="pub-form-helper">Use the account password you already trust for this workspace.</p>
                )}

                <button type="submit" className="pub-signin-submit" disabled={!isInteractive || isPasswordSubmitting} aria-busy={isPasswordSubmitting}>
                  {isPasswordSubmitting ? <span className="pub-spinner" /> : "Sign in"}
                </button>
              </form>
            ) : (
              <form method="post" className="pub-auth-panel pub-auth-panel-single" onSubmit={(event) => void handleMagicLinkSubmit(event)}>
                <div className="pub-auth-panel-head">
                  <h2>Verification code</h2>
                  <p>We&apos;ll send a code to your saved contact details.</p>
                </div>

                <label className="pub-form-label" htmlFor="magicLinkCountryCode">Country</label>
                <div className="pub-select-wrapper">
                  <select id="magicLinkCountryCode" name="magicLinkCountryCode" className="pub-select" defaultValue="GH" disabled={!isInteractive || isMagicLinkSubmitting || Boolean(magicLinkChallenge)}>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>{country.label}</option>
                    ))}
                  </select>
                  <span className="pub-select-chevron" aria-hidden="true">▾</span>
                </div>

                <label className="pub-form-label" htmlFor="magicLinkIdentifier">Email or phone number</label>
                <div className="pub-input-wrapper">
                  <input
                    id="magicLinkIdentifier"
                    name="magicLinkIdentifier"
                    type="text"
                    className="pub-input"
                    autoComplete="username"
                    placeholder="e.g. +233241234567 or ama@email.com"
                    aria-invalid={magicLinkError ? "true" : "false"}
                    disabled={!isInteractive || isMagicLinkSubmitting || Boolean(magicLinkChallenge)}
                    required
                    data-error={magicLinkError ? "true" : undefined}
                  />
                </div>

                {magicLinkChallenge ? (
                  <>
                    <label className="pub-form-label" htmlFor="verificationCode">Verification code</label>
                    <div className="pub-input-wrapper">
                      <input
                        id="verificationCode"
                        name="verificationCode"
                        type="text"
                        className="pub-input"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        placeholder="Enter the 6-digit code"
                        aria-invalid={magicLinkError ? "true" : "false"}
                        disabled={!isInteractive || isMagicLinkSubmitting}
                        required
                        data-error={magicLinkError ? "true" : undefined}
                      />
                      {magicLinkChallenge.previewCode ? (
                        <p className="pub-form-helper">
                          Use this code in this workspace: <strong>{magicLinkChallenge.previewCode}</strong>
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {magicLinkError ? (
                  <p className="pub-field-error" role="alert">{magicLinkError}</p>
                ) : magicLinkSuccess ? (
                  <p className="pub-field-success" role="status">{magicLinkSuccess}</p>
                ) : (
                  <p className="pub-form-helper">Request a code first, then enter it here to continue.</p>
                )}

                <button type="submit" className="pub-signin-submit" disabled={!isInteractive || isMagicLinkSubmitting} aria-busy={isMagicLinkSubmitting}>
                  {isMagicLinkSubmitting
                    ? <span className="pub-spinner" />
                    : magicLinkChallenge
                      ? "Sign in"
                      : "Send me a code"}
                </button>
              </form>
            )}

            <div className="pub-entry-support">
              <Link href="/contact" className="pub-inline-text-link">
                Need help getting back in?
              </Link>
              <Link href="/signup" className="pub-inline-text-link">
                Need an account? Create one
              </Link>
              <Link href="/preview" className="pub-inline-text-link pub-inline-text-link-strong">
                View guided preview
                <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
