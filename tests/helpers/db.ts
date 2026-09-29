import { db } from "@/db/client";
import type { DbTransaction } from "@/modules/inventory/mutations";

class RollbackSignal extends Error {}

/**
 * Runs `fn` inside a real Postgres transaction against the live dev DB, then always rolls
 * it back — every write `fn` makes (directly, or via any mutation function that accepts an
 * optional transaction client and is passed `tx`) is undone, leaving zero trace. This is
 * the ONLY way integration tests are allowed to touch the shared dev database — see
 * DATABASE.md's Phase 14 scope note.
 *
 * Only works for writes made through the `tx` passed to `fn`. A function that reaches for
 * the global `db` singleton instead of the `tx` it's given opens its own top-level
 * transaction and WILL commit for real — that's why `placeOrder`, `transitionOrderStatus`,
 * and `getUserRoles` all accept an optional trailing `client` parameter now.
 */
export async function withRollback(fn: (tx: DbTransaction) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new RollbackSignal();
    });
  } catch (error) {
    if (!(error instanceof RollbackSignal)) throw error;
  }
}
