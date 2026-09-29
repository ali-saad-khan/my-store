"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself (rare) — must render its own
 * <html>/<body> since it replaces the whole tree, including the layout that would
 * normally provide them. Kept deliberately plain (no shared components), since a broken
 * root layout is exactly the case where those components might be the problem.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "6rem auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666" }}>Please try again.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
