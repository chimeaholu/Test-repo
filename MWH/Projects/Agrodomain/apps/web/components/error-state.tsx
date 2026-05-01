"use client";

import React from "react";
import Link from "next/link";

type UserFacingError = Error & { digest?: string };

interface ErrorStateProps {
  context: string;
  error?: UserFacingError | null;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  title?: string;
}

function resolveUserFacingMessage(error?: UserFacingError | null): string {
  if (!error) {
    return "We hit an unexpected problem while loading this view. Your saved work and session state remain intact.";
  }

  const normalizedMessage = error.message.trim();
  if (!normalizedMessage) {
    return "We hit an unexpected problem while loading this view. Your saved work and session state remain intact.";
  }

  if (/failed to fetch|networkerror|network request failed/i.test(normalizedMessage)) {
    return "We could not reach the live service backing this view. Check your connection and try again.";
  }

  if (/chunk/i.test(error.name) || /loading css chunk|loading chunk/i.test(normalizedMessage)) {
    return "Part of the latest interface did not load correctly. Retry once, and reload the page if the problem persists.";
  }

  if (process.env.NODE_ENV !== "production") {
    return normalizedMessage;
  }

  return "We hit an unexpected problem while loading this view. Your saved work and session state remain intact.";
}

export function ErrorState({
  context,
  error,
  onPrimaryAction,
  primaryActionLabel = "Try again",
  secondaryHref = "/",
  secondaryLabel = "Back to home",
  title,
}: ErrorStateProps) {
  const message = resolveUserFacingMessage(error);

  return (
    <section className="hero-card" role="alert" aria-live="assertive">
      <p className="eyebrow">{context}</p>
      <h2 className="display-title">
        {title ?? "This section encountered an unexpected error."}
      </h2>
      <p className="muted">{message}</p>
      {error?.digest ? (
        <p className="muted detail-note">Reference: {error.digest}</p>
      ) : null}
      <div className="actions-row">
        {onPrimaryAction ? (
          <button className="button-primary" onClick={onPrimaryAction} type="button">
            {primaryActionLabel}
          </button>
        ) : null}
        <Link className="button-ghost" href={secondaryHref}>
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
