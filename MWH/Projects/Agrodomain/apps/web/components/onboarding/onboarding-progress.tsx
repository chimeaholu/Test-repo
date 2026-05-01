"use client";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function OnboardingProgress({ currentStep, totalSteps, labels }: OnboardingProgressProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div className="onboarding-progress-wrap">
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
      <div className="onboarding-progress-labels" aria-hidden="true">
        {labels.map((label, index) => (
          <span
            key={label}
            className="onboarding-progress-label"
            data-active={index + 1 === currentStep || undefined}
            data-complete={index + 1 < currentStep || undefined}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
