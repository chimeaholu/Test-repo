"use client";

import { clsx } from "clsx";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

type Strength = "empty" | "weak" | "fair" | "good" | "strong";

function evaluateStrength(pw: string): { level: Strength; label: string; score: number } {
  if (!pw) return { level: "empty", label: "", score: 0 };

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: "weak", label: "Weak", score: 1 };
  if (score <= 2) return { level: "fair", label: "Fair", score: 2 };
  if (score <= 3) return { level: "good", label: "Good", score: 3 };
  return { level: "strong", label: "Strong", score: 4 };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { level, label, score } = evaluateStrength(password);

  if (level === "empty") return null;

  const colorMap: Record<Exclude<Strength, "empty">, string> = {
    weak: "var(--color-error, #c44b3b)",
    fair: "var(--color-accent-500, #e5a94e)",
    good: "var(--color-brand-500, #4a8c5e)",
    strong: "var(--color-brand-700, #2d5a3d)",
  };

  return (
    <div className={clsx("ds-password-strength", className)} aria-live="polite">
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= score ? colorMap[level] : "var(--color-neutral-200, #e2e0dc)",
              transition: "background 200ms ease",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: "0.8125rem",
          color: colorMap[level],
          marginTop: 4,
          display: "block",
        }}
      >
        {label}
      </span>
    </div>
  );
}
