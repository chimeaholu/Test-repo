"use client";

import { Button } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";

interface ConsentStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface PermissionToggle {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PERMISSIONS: PermissionToggle[] = [
  {
    key: "anonymizedData",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="9" width="7" height="12" rx="1" />
        <rect x="14" y="3" width="7" height="3" rx="1" />
      </svg>
    ),
    title: "Regional insight sharing",
    description: "Helps improve local market and planning insight without opening your private profile.",
  },
  {
    key: "priceAlerts",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    title: "Price updates",
    description: "Receive helpful alerts when market conditions change around your crops.",
  },
  {
    key: "weatherAlerts",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
        <path d="M9.5 19a4.5 4.5 0 0 1-2-8.5" />
        <path d="M15 10a4 4 0 0 0-7.5-1" />
      </svg>
    ),
    title: "Weather alerts",
    description: "Receive weather warnings and planning updates for your area.",
  },
  {
    key: "smsNotifications",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
      </svg>
    ),
    title: "SMS updates",
    description: "Keep important updates coming through even when internet access is limited.",
  },
  {
    key: "auditTrail",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
    title: "Important action records",
    description: "Keep key trade and payment actions properly recorded inside your account.",
  },
];

export function ConsentStep({ data, onUpdate, onContinue, onBack }: ConsentStepProps) {
  const togglePermission = (key: string) => {
    onUpdate({
      permissions: {
        ...data.permissions,
        [key]: !data.permissions[key],
      },
    });
  };

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step-heading">Permissions</h2>
      <p className="onboarding-step-subheading">
        Review the settings that keep useful updates and important records working.
      </p>

      <div className="onboarding-permission-list">
        {PERMISSIONS.map((perm) => {
          const isOn = data.permissions[perm.key] ?? true;
          return (
            <div key={perm.key} className="onboarding-permission-card">
              <div className="onboarding-permission-icon" aria-hidden="true">
                {perm.icon}
              </div>
              <div className="onboarding-permission-text">
                <p className="onboarding-permission-title">{perm.title}</p>
                <p className="onboarding-permission-desc">{perm.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={perm.title}
                className={`onboarding-toggle ${isOn ? "on" : "off"}`}
                onClick={() => togglePermission(perm.key)}
              >
                <span className="onboarding-toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="onboarding-settings-note">
        You can change these choices later in Settings.
      </p>

      <div className="onboarding-nav-buttons">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
