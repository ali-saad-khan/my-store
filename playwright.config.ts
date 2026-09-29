import { defineConfig } from "@playwright/test";

/**
 * E2E tests drive a real browser against the real dev server and dev Supabase DB —
 * they intentionally create real orders/data, same as manual testing every phase (see
 * DATABASE.md's Phase 14 scope note). Not wrapped in a rollback transaction like the
 * integration tests: these exercise the full stack (Next.js + Supabase Auth + Postgres)
 * exactly as a real user would.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
