"use client";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div
      className="onboarding-progress"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
    >
      <div
        className="onboarding-progress-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
