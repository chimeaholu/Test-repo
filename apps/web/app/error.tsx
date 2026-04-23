"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        placeContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "'Avenir Next', 'Segoe UI', 'Trebuchet MS', sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif",
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          lineHeight: 1,
          margin: 0,
        }}
      >
        Something went wrong
      </h1>
      <p style={{ color: "#345246", maxWidth: "36rem", margin: "0 auto" }}>
        An unexpected error occurred. If this keeps happening, try reloading the page.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "0.5rem" }}>
        <button
          onClick={reset}
          type="button"
          style={{
            minHeight: 48,
            padding: "0.8rem 1.5rem",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #2d6a4f 0%, #1f513b 100%)",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          type="button"
          style={{
            minHeight: 48,
            padding: "0.8rem 1.5rem",
            borderRadius: 999,
            border: "1px solid rgba(23, 38, 28, 0.2)",
            background: "transparent",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Go home
        </button>
      </div>
    </main>
  );
}
