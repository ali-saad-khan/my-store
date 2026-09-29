import { describe, expect, it } from "vitest";
import { roles, userRoles } from "@/db/schema";
import { withRollback } from "../../../tests/helpers/db";
import { getAnyExistingProfileId } from "../../../tests/helpers/fixtures";
import { getUserRoles } from "./session";

/**
 * Covers the authorization layer (role lookups that `requireRole`/`requireAdmin` gate on).
 * Real Supabase Auth signup/session issuance is NOT covered here — it's an external
 * service, not part of our Postgres transaction, so it can't be safely rolled back. See
 * DATABASE.md's Phase 14 scope note.
 */
describe("getUserRoles (integration, always rolled back)", () => {
  it("returns an empty array for a profile with no role grants", async () => {
    await withRollback(async (tx) => {
      const profileId = await getAnyExistingProfileId(tx);
      // A throwaway role with no grant for this profile — the query should simply find
      // nothing for that (profile, role) pair without needing a fake profile row.
      const [role] = await tx
        .insert(roles)
        .values({ name: `test-role-${crypto.randomUUID().slice(0, 8)}` })
        .returning();

      const result = await getUserRoles(profileId, tx);
      expect(result).not.toContain(role.name);
    });
  });

  it("returns exactly the roles granted to a profile", async () => {
    await withRollback(async (tx) => {
      const profileId = await getAnyExistingProfileId(tx);
      const [role] = await tx
        .insert(roles)
        .values({ name: `test-role-${crypto.randomUUID().slice(0, 8)}` })
        .returning();
      await tx.insert(userRoles).values({ profileId, roleId: role.id });

      const result = await getUserRoles(profileId, tx);
      expect(result).toContain(role.name);
    });
  });
});
