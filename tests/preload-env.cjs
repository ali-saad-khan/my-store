/**
 * Loaded via NODE_OPTIONS="--require ./tests/preload-env.cjs" (see the `test:integration`
 * script) — plain Node `require`, before Vite/Vitest's own module system starts.
 *
 * `@next/env`'s loadEnvConfig silently loads zero files when imported through Vite's
 * transform pipeline (confirmed live: a Vitest `setupFiles` entry calling it reported
 * `loadedEnvFiles: []` even though the exact same call via plain `tsx`/Node found
 * `.env.local` correctly). Preloading it here, outside Vite, sets `process.env` in the
 * main process before Vitest forks/spawns its test workers, which inherit it normally.
 *
 * This MUST stay `@next/env`, not `dotenv` — DATABASE_URL contains an escaped `\$` that
 * only `@next/env`'s expansion rules handle correctly (see DATABASE.md's Phase 2 notes on
 * why a plain dotenv loader silently corrupts it).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- must be plain CJS require() to run via Node's --require flag, before Vite/Vitest's ESM pipeline starts
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
