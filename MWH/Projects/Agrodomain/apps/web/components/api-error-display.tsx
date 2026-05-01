"use client";

interface ApiErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
}

function normalizeMessage(error: Error | string | null): string | null {
  if (!error) return null;
  const msg = typeof error === "string" ? error : error.message;
  if (msg === "Failed to fetch") {
    return "Unable to reach the server. Check your connection and try again.";
  }
  if (msg === "Session token missing") {
    return "Your session has expired. Please sign in again.";
  }
  return msg;
}

export function ApiErrorDisplay({ error, onRetry }: ApiErrorDisplayProps) {
  const message = normalizeMessage(error);
  if (!message) return null;

  return (
    <div className="queue-card" role="alert">
      <p className="eyebrow">Request failed</p>
      <p className="muted">{message}</p>
      {onRetry ? (
        <button className="button-ghost" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}
