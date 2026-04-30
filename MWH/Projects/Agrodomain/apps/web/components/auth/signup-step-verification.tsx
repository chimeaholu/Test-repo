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
  summary: Array<{ label: string; value: string }>;
}

export function SignupStepVerification({ data, onChange, errors, phone, phonePrefix, summary }: Props) {
  return (
    <div className="stack-md">
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
          Review your setup
        </h3>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>
          You&apos;ll continue into setup before your workspace opens.
        </p>
      </div>

      <div className="pub-review-list">
        {summary.map((item) => (
          <div key={item.label} className="pub-review-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <FormField
        label="Account path"
        htmlFor="signup-otp"
        error={errors.otp}
        helper={`Your account will be created for ${phonePrefix} ${phone} and then moved into setup.`}
      >
        <Input
          id="signup-otp"
          inputSize="lg"
          placeholder="Ready to create your account"
          disabled
          value={data.otp}
          error={Boolean(errors.otp)}
          onChange={() => undefined}
          style={{ fontWeight: 600, textAlign: "center" }}
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
