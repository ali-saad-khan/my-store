import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { profiles, roles, userRoles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/** Verified against the Supabase Auth server — never trust a locally-decoded JWT alone. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return profile ?? null;
}

export async function getUserRoles(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.profileId, profileId));

  return rows.map((row) => row.name);
}

/** Redirects to /login if there's no authenticated user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects unauthenticated users to /login, and non-matching authenticated users to /. */
export async function requireRole(roleName: string) {
  const user = await requireUser();
  const userRoleNames = await getUserRoles(user.id);
  if (!userRoleNames.includes(roleName)) redirect("/");
  return user;
}

export async function requireAdmin() {
  return requireRole("admin");
}
