/**
 * One-off bootstrap script: grants the "admin" role to an existing profile.
 * Usage: pnpm admin:promote user@example.com
 * (The user must have already registered — this doesn't create an account.)
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm admin:promote <email>");
    process.exit(1);
  }

  const { db } = await import("../client");
  const { eq } = await import("drizzle-orm");
  const { profiles, roles, userRoles } = await import("../schema");

  const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  if (!profile) {
    console.error(`No profile found for ${email}. Have they registered yet?`);
    process.exit(1);
  }

  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "admin")).limit(1);
  if (!adminRole) {
    console.error('No "admin" role found. Was the Phase 1 seed run?');
    process.exit(1);
  }

  await db
    .insert(userRoles)
    .values({ profileId: profile.id, roleId: adminRole.id })
    .onConflictDoNothing();

  console.log(`${email} is now an admin.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
