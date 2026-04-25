"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useAppState } from "@/components/app-provider";
import { signInSchema } from "@/features/identity/schema";
import { PublicNav } from "@/components/public/public-nav";

const roles = [
  {
    key: "farmer",
    value: "farmer" as const,
    label: "Farmer",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </svg>
    ),
  },
  {
    key: "buyer",
    value: "buyer" as const,
    label: "Buyer",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    key: "cooperative",
    value: "cooperative" as const,
    label: "Co-op Manager",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
  },
  {
    key: "transporter",
    value: "transporter" as const,
    label: "Transporter",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: "investor",
    value: "investor" as const,
    label: "Investor",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    key: "extension_agent",
    value: "extension_agent" as const,
    label: "Extension Agent",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

const countries = [
  { code: "GH" as const, label: "Ghana" },
  { code: "NG" as const, label: "Nigeria" },
  { code: "JM" as const, label: "Jamaica" },
];

export default function SignInPage() {
  const { signIn } = useAppState();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [selectedRole, setSelectedRole] = useState("farmer");
  const errorId = error ? "signin-form-error" : undefined;

  useEffect(() => {
    setIsInteractive(true);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    setIsSubmitting(true);
    try {
      await signIn(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(
        message === "Failed to fetch"
          ? "Unable to reach the server. Check your connection and try again."
          : message === "demo_auth_disabled"
            ? "This deployment has disabled the demo sign-in flow until production authentication is configured."
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pub-page">
      <PublicNav />

      <main id="main-content" className="pub-signin-bg">
        <div className="pub-signin-card">
          <div className="pub-signin-logo">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="16" fill="#2d5a3d" opacity="0.12" />
              <path d="M18 28V16c0-6 3.5-10.5 10-13-6.5 2.5-8.5 7-10 13z" fill="#2d5a3d" />
              <path d="M18 28V16c0-6-3.5-10.5-10-13 6.5 2.5 8.5 7 10 13z" fill="#4a8c5e" opacity="0.7" />
              <circle cx="18" cy="30" r="2" fill="#c17b2a" />
            </svg>
          </div>

          <h1 className="pub-signin-heading">Welcome back</h1>
          <p className="pub-signin-subheading">Sign in to your Agrodomain account</p>

          <div className="pub-signin-divider" />

          <form
            data-interactive={isInteractive ? "true" : "false"}
            onSubmit={(e) => void handleSubmit(e)}
          >
            {/* Role selection */}
            <fieldset className="pub-role-fieldset">
              <legend className="pub-form-label">Your role</legend>
              <p className="pub-form-helper" id="role-help">
                Choose the workspace that matches the tasks you need to complete.
              </p>
              <div className="pub-role-grid">
                {roles.map((r) => (
                  <label
                    key={r.key}
                    className="pub-role-tile"
                    data-selected={selectedRole === r.key ? "true" : undefined}
                  >
                    <input
                      aria-describedby="role-help"
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={selectedRole === r.key}
                      onChange={() => setSelectedRole(r.key)}
                      disabled={isSubmitting}
                    />
                    <span className="pub-role-icon">{r.icon}</span>
                    <span className="pub-role-label">{r.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Country */}
            <label className="pub-form-label" htmlFor="countryCode">Your country</label>
            <div className="pub-select-wrapper">
              <select
                id="countryCode"
                name="countryCode"
                className="pub-select"
                defaultValue="GH"
                disabled={isSubmitting}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="pub-select-chevron" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>

            <label className="pub-form-label" htmlFor="email">Email address</label>
            <div className="pub-input-wrapper">
              <input
                id="email"
                name="email"
                type="email"
                className="pub-input"
                autoComplete="email"
                placeholder="e.g. ama@email.com"
                aria-describedby={errorId}
                aria-invalid={error ? "true" : "false"}
                disabled={isSubmitting}
                required
                data-error={error ? "true" : undefined}
              />
              {error && (
                <p className="pub-field-error" id={errorId} role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Hidden displayName — populated from email prefix for compatibility */}
            <input type="hidden" name="displayName" value="User" />

            <button
              type="submit"
              className="pub-signin-submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <span className="pub-spinner" /> : "Sign In"}
            </button>
          </form>

          <p className="pub-signup-prompt">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="pub-signup-link">
              Sign up
            </Link>
          </p>

          <div className="pub-signin-divider" />

          <div className="pub-trust-badges">
            <div className="pub-trust-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>256-bit SSL Encryption</span>
            </div>
            <div className="pub-trust-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>GDPR Compliant</span>
            </div>
            <div className="pub-trust-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Data Protection Act</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="pub-minimal-footer">
        <span>&copy; 2026 Agrodomain Technologies Ltd.</span>
        <Link href="/legal/terms">Terms</Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/legal/privacy">Privacy</Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/contact">Contact</Link>
      </footer>
    </div>
  );
}
