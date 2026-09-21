import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// `generate` only diffs local TS schema files and needs no DB connection; only
// `migrate`/`push`/`studio` actually connect, so this is left unset-safe here.
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    // Migrations run against Supabase's direct (non-pooled) connection.
    url: process.env.DIRECT_URL ?? "",
  },
});
