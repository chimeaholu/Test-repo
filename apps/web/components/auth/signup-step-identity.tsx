"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { FormField } from "@/components/molecules/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PasswordStrength } from "./password-strength";
import { clsx } from "clsx";

export interface IdentityData {
  fullName: string;
  email: string;
  phone: string;
  phonePrefix: string;
  password: string;
  role: string;
  countryCode: string;
}

interface Props {
  data: IdentityData;
  onChange: Dispatch<SetStateAction<IdentityData>>;
  errors: Partial<Record<keyof IdentityData, string>>;
}

const roles = [
  { value: "farmer", label: "Farmer", icon: "🌾", description: "Grow, manage, and sell your crops with AI-powered tools" },
  { value: "buyer", label: "Buyer", icon: "🛒", description: "Source crops directly from verified farms at fair prices" },
  { value: "cooperative", label: "Cooperative Manager", icon: "🏢", description: "Manage your cooperative's members, inventory, and trade" },
  { value: "transporter", label: "Transporter", icon: "🚛", description: "Connect with farmers and buyers who need your trucks" },
  { value: "investor", label: "Investor", icon: "💰", description: "Fund farms and earn returns on agricultural investments" },
  { value: "extension_agent", label: "Extension Agent", icon: "📋", description: "Support farmers with expert agronomic advice and training" },
];

const countries = [
  { value: "GH", label: "Ghana" },
  { value: "NG", label: "Nigeria" },
  { value: "JM", label: "Jamaica" },
];

const phonePrefixes = [
  { value: "+233", label: "+233" },
  { value: "+234", label: "+234" },
  { value: "+1-876", label: "+1-876" },
];

export function SignupStepIdentity({ data, onChange, errors }: Props) {
  const update = (field: keyof IdentityData, value: string) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="stack-md">
      {/* Role Selection */}
      <div>
        <p className="ds-form-label ds-form-label-required" style={{ marginBottom: 12 }}>
          Choose your role
        </p>
        <p className="ds-form-helper" style={{ marginBottom: 20 }}>
          Select how you will use Agrodomain
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              className={clsx(
                "ds-role-card",
                data.role === r.value && "ds-role-card-selected",
              )}
              onClick={() => update("role", r.value)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 6,
                padding: "20px 16px",
                border: data.role === r.value
                  ? "2px solid var(--color-brand-600, #2d5a3d)"
                  : "2px solid var(--color-neutral-200, #e2e0dc)",
                borderRadius: 14,
                background: data.role === r.value
                  ? "rgba(74, 140, 94, 0.04)"
                  : "var(--color-neutral-50, #f8f3ea)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 150ms ease",
              }}
            >
              <span style={{ fontSize: 28 }}>{r.icon}</span>
              <strong style={{ fontSize: "0.9375rem", color: "var(--ink)" }}>
                {r.label}
              </strong>
              <span
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  color: "var(--ink-muted)",
                }}
              >
                {r.description}
              </span>
            </button>
          ))}
        </div>
        {errors.role && (
          <span className="ds-form-error" role="alert" style={{ marginTop: 8, display: "block" }}>
            {errors.role}
          </span>
        )}
      </div>

      <FormField label="Full name" htmlFor="signup-name" required error={errors.fullName}>
        <Input
          id="signup-name"
          inputSize="lg"
          placeholder="e.g. Ama Mensah"
          autoComplete="name"
          value={data.fullName}
          error={Boolean(errors.fullName)}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </FormField>

      <FormField label="Email address" htmlFor="signup-email" required error={errors.email}>
        <Input
          id="signup-email"
          type="email"
          inputSize="lg"
          placeholder="e.g. ama@email.com"
          autoComplete="email"
          value={data.email}
          error={Boolean(errors.email)}
          onChange={(e) => update("email", e.target.value)}
        />
      </FormField>

      <FormField label="Phone number" htmlFor="signup-phone" required error={errors.phone}>
        <div style={{ display: "flex", gap: 8 }}>
          <Select
            id="signup-phone-prefix"
            aria-label="Phone country code"
            options={phonePrefixes}
            value={data.phonePrefix}
            onChange={(e) => update("phonePrefix", e.target.value)}
            style={{ width: 110, flexShrink: 0 }}
          />
          <Input
            id="signup-phone"
            type="tel"
            inputSize="lg"
            placeholder="e.g. 024 123 4567"
            autoComplete="tel"
            value={data.phone}
            error={Boolean(errors.phone)}
            onChange={(e) => update("phone", e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </FormField>

      <FormField label="Password" htmlFor="signup-password" required error={errors.password}>
        <Input
          id="signup-password"
          type="password"
          inputSize="lg"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={data.password}
          error={Boolean(errors.password)}
          onChange={(e) => update("password", e.target.value)}
        />
        <PasswordStrength password={data.password} />
      </FormField>

      <FormField label="Country" htmlFor="signup-country" required error={errors.countryCode}>
        <Select
          id="signup-country"
          options={countries}
          placeholder="Select country"
          value={data.countryCode}
          error={Boolean(errors.countryCode)}
          onChange={(e) => update("countryCode", e.target.value)}
        />
      </FormField>
    </div>
  );
}
