"use client";

import { toast } from "sonner";

/**
 * Presentational only — there's no real subscriber list/backend yet (disclosed gap, not
 * faked persistence). Submitting just acknowledges the input; wire this up to a real
 * capture mechanism before relying on it for marketing.
 */
export function NewsletterSignupForm() {
  return (
    <form
      className="flex w-full max-w-md gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        toast.success("Thanks — we'll be in touch!");
        event.currentTarget.reset();
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="you@example.com"
        className="border-border bg-background focus-visible:ring-ring flex-1 rounded-full border px-5 py-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
      />
      <button
        type="submit"
        className="bg-foreground text-background rounded-full px-7 py-3 text-sm font-bold whitespace-nowrap"
      >
        Sign up
      </button>
    </form>
  );
}
