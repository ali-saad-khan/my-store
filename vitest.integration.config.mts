import { defineConfig } from "vitest/config";

/**
 * Integration tests: hit the real dev Supabase Postgres DB, but every test runs inside a
 * transaction that's always rolled back (see tests/helpers/db.ts's `withRollback`) — zero
 * trace left. Run sequentially (no file parallelism) since they share one database and
 * some tests intentionally read aggregate state (usage counts) that would race under
 * concurrent execution.
 *
 * Env vars (DATABASE_URL etc.) are loaded via NODE_OPTIONS in the `test:integration` npm
 * script, not a Vitest `setupFiles` entry — see tests/preload-env.cjs for why.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("tests/mocks/server-only.ts", import.meta.url).pathname },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
