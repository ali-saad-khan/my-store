"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-segment error boundary. Never renders `error.message` directly — MasterPlan.txt
 * section 26: never expose internal error details to customers, always show a generic
 * message. `console.error` is a placeholder for real error monitoring (Sentry or similar,
 * per section 27) — not wired up yet, disclosed in DATABASE.md.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">Please try again.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
