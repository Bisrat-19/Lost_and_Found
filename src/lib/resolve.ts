import "server-only";
import { db } from "./db";
import { getLostByToken, getMatchesForLost, isExpired } from "./queries";

export type ResolveResult =
  | { ok: true; lostId: string; foundId: string | null }
  | { ok: false; status: 404 | 409 | 422; error: string };

/**
 * Owner says "I got it back". Closes the lost report and, if they picked one,
 * the found report it matched. Reports are soft-closed (status), never deleted.
 *
 * The owner may only close a found report that is currently one of *their
 * matches*, so a private link can't be used to hide arbitrary found items.
 */
export async function resolveLostReport(token: string, foundId: string | null): Promise<ResolveResult> {
  const lost = await getLostByToken(token);
  if (!lost) return { ok: false, status: 404, error: "Report not found" };
  if (lost.status !== "OPEN" || isExpired(lost)) {
    return { ok: false, status: 409, error: "This report is already closed" };
  }

  if (foundId) {
    const { shown } = await getMatchesForLost(lost);
    if (!shown.some((v) => v.found.id === foundId)) {
      return { ok: false, status: 422, error: "That found item is not one of your matches" };
    }
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    // Re-check inside the transaction so two quick clicks can't both succeed
    const updated = await tx.report.updateMany({
      where: { id: lost.id, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: now, resolvedWithId: foundId },
    });
    if (updated.count === 0) throw new AlreadyClosed();
    if (foundId) {
      await tx.report.updateMany({
        where: { id: foundId, status: "OPEN" },
        data: { status: "RESOLVED", resolvedAt: now },
      });
    }
  }).catch((err) => {
    if (err instanceof AlreadyClosed) return;
    throw err;
  });

  return { ok: true, lostId: lost.id, foundId };
}

class AlreadyClosed extends Error {}
