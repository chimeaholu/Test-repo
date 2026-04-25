import React from "react";
import { clsx } from "clsx";

interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={clsx("ds-steps", className)} role="list" aria-label="Progress">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={step.id} style={{ display: "contents" }}>
            <div
              className={clsx("ds-step", isActive && "ds-step-active", isCompleted && "ds-step-completed")}
              role="listitem"
              aria-current={isActive ? "step" : undefined}
            >
              <span className="ds-step-circle">
                {isCompleted ? "✓" : i + 1}
              </span>
              <span className="ds-step-label">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx("ds-step-connector", isCompleted && "ds-step-connector-completed")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
