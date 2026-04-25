"use client";

import type { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/molecules/form-field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export interface VerificationData {
  otp: string;
  termsAccepted: boolean;
  notificationsAccepted: boolean;
  marketingOptIn: boolean;
}

interface Props {
  data: VerificationData;
  onChange: Dispatch<SetStateAction<VerificationData>>;
  errors: Partial<Record<keyof VerificationData, string>>;
  phone: string;
  phonePrefix: string;
}

export function SignupStepVerification({ data, onChange, errors, phone, phonePrefix }: Props) {
  return (
    <div className="stack-md">
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
          Verify and agree
        </h3>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>
          Enter the verification code and review our terms to complete your registration
        </p>
      </div>

      <FormField
        label="Verification code"
        htmlFor="signup-otp"
        required
        error={errors.otp}
        helper={`We sent a 6-digit code to ${phonePrefix} ${phone}`}
      >
        <Input
          id="signup-otp"
          inputSize="lg"
          placeholder="e.g. 123456"
          maxLength={6}
          pattern="[0-9]{6}"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={data.otp}
          error={Boolean(errors.otp)}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
            onChange((prev) => ({ ...prev, otp: val }));
          }}
          style={{ letterSpacing: "0.3em", fontWeight: 600, textAlign: "center" }}
        />
      </FormField>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        <Checkbox
          label={
            <span>
              I agree to the{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent-700, #9a5c1b)", fontWeight: 600 }}
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent-700, #9a5c1b)", fontWeight: 600 }}
              >
                Privacy Policy
              </Link>
            </span>
          }
          checked={data.termsAccepted}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, termsAccepted: (e.target as HTMLInputElement).checked }))
          }
        />
        {errors.termsAccepted && (
          <span className="ds-form-error" role="alert">{errors.termsAccepted}</span>
        )}

        <Checkbox
          label="I consent to receiving SMS and email notifications about my account, transactions, and security alerts"
          checked={data.notificationsAccepted}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, notificationsAccepted: (e.target as HTMLInputElement).checked }))
          }
        />
        {errors.notificationsAccepted && (
          <span className="ds-form-error" role="alert">{errors.notificationsAccepted}</span>
        )}

        <Checkbox
          label="I would like to receive agricultural tips, market price updates, and weather alerts (optional)"
          checked={data.marketingOptIn}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, marketingOptIn: (e.target as HTMLInputElement).checked }))
          }
        />
      </div>
    </div>
  );
}
