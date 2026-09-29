import { defineConfig } from "vitest/config";

/** Unit tests: pure functions only, no DB/env access. Fast, safe to run anytime. */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
  },
});
