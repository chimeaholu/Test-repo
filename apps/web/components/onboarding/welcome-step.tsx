"use client";

import { useState } from "react";
import type { IdentitySession } from "@agrodomain/contracts";
import { Button } from "@/components/ui";
import { roleLabel, APP_ROLES } from "@/features/shell/model";

interface WelcomeStepProps {
  session: IdentitySession;
  onContinue: () => void;
}

const countryLabel: Record<string, string> = {
  GH: "Ghana",
  NG: "Nigeria",
  JM: "Jamaica",
};

export function WelcomeStep({ session, onContinue }: WelcomeStepProps) {
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  const firstName = session.actor.display_name?.split(" ")[0] ?? "there";
  const role = roleLabel(session.actor.role);
  const country = countryLabel[session.actor.country_code] ?? session.actor.country_code;

  return (
    <div className="onboarding-step onboarding-step-welcome">
      {/* Celebration illustration */}
      <div className="onboarding-welcome-illustration" aria-hidden="true">
        <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
          {/* Confetti pieces */}
          <rect x="30" y="20" width="8" height="8" rx="2" fill="var(--color-accent-400)" transform="rotate(15 30 20)" />
          <rect x="155" y="15" width="6" height="6" rx="1" fill="var(--color-brand-400)" transform="rotate(-20 155 15)" />
          <rect x="50" y="8" width="5" height="12" rx="1" fill="var(--color-accent-300)" transform="rotate(30 50 8)" />
          <rect x="170" y="35" width="7" height="5" rx="1" fill="var(--color-brand-300)" transform="rotate(-10 170 35)" />
          <rect x="20" y="55" width="6" height="6" rx="3" fill="var(--color-accent-500)" />
          <rect x="180" y="60" width="5" height="5" rx="2.5" fill="var(--color-brand-500)" />
          {/* Person */}
          <circle cx="100" cy="70" r="20" fill="var(--color-brand-100)" />
          <circle cx="100" cy="60" r="14" fill="var(--color-accent-100)" />
          <circle cx="100" cy="56" r="10" fill="var(--color-accent-200)" />
          {/* Body */}
          <path d="M80 90 C80 78 120 78 120 90 L120 130 C120 135 80 135 80 130 Z" fill="var(--color-brand-500)" />
          {/* Waving arm */}
          <path d="M120 92 C128 82 138 75 142 80 C146 85 135 95 125 100" fill="var(--color-brand-400)" strokeWidth="0" />
          {/* Farm elements */}
          <rect x="10" y="135" width="180" height="25" rx="4" fill="var(--color-brand-50)" />
          <path d="M25 135 L35 120 L45 135" fill="var(--color-brand-300)" />
          <path d="M60 135 L68 125 L76 135" fill="var(--color-brand-200)" />
          <path d="M140 135 L150 118 L160 135" fill="var(--color-brand-300)" />
        </svg>
      </div>

      <h1 className="onboarding-welcome-heading">
        Welcome to Agrodomain, {firstName}!
      </h1>

      <p className="onboarding-welcome-role">
        Your account is set up as a <strong>{role}</strong> in {country}.
      </p>

      <p className="onboarding-welcome-body">
        Let&apos;s get your workspace ready so you can start trading,
        monitoring weather, and growing your farm.
      </p>

      <Button
        variant="secondary"
        size="lg"
        className="onboarding-lets-go-btn"
        onClick={onContinue}
      >
        Let&apos;s Go!
      </Button>

      {!showRoleSelector ? (
        <p className="onboarding-change-role">
          Not the right role?{" "}
          <button
            type="button"
            className="onboarding-change-role-link"
            onClick={() => setShowRoleSelector(true)}
          >
            Change it
          </button>
        </p>
      ) : (
        <div className="onboarding-role-selector" role="radiogroup" aria-label="Select your role">
          {APP_ROLES.filter((r) => r !== "admin" && r !== "finance").map((r) => (
            <button
              key={r}
              type="button"
              className={`onboarding-role-option ${session.actor.role === r ? "active" : ""}`}
              aria-pressed={session.actor.role === r}
              onClick={() => setShowRoleSelector(false)}
            >
              {roleLabel(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
