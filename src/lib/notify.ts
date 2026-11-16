import "server-only";
import type { Report } from "@/generated/prisma/client";
import { POSSIBLE_MATCH, REPORT_EXPIRY_DAYS } from "./constants";
import { db } from "./db";
import { publishPublic, publishToLost } from "./events";
import { DATE_GRACE_DAYS, matchesForFound } from "./matching/score";
import { getMatchesForLost, toMatchable } from "./queries";
import { toPublicReport } from "./reports";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pre-filter slack: a pair can score a few points differently once IDF uses the owner's full candidate set. */
const PREFILTER_SLACK = 10;

/**
 * Called after a report is saved (outside the request, via `after()`).
 * A new FOUND report is announced publicly and pushed to the owners of every
 * lost report it could belong to.
 */
export async function notifyReportCreated(report: Report): Promise<void> {
  if (report.type !== "FOUND") return; // lost reports are private, nothing to announce

  publishPublic({ type: "report.created", report: toPublicReport(report) });

  const openLost = await db.report.findMany({
    where: {
      type: "LOST",
      status: "OPEN",
      createdAt: { gte: new Date(Date.now() - REPORT_EXPIRY_DAYS * DAY_MS) },
      date: { lte: new Date(report.date.getTime() + DATE_GRACE_DAYS * DAY_MS) },
    },
  });
  if (openLost.length === 0) return;

  // Cheap pass to find candidate owners...
  const candidates = matchesForFound(toMatchable(report), openLost.map(toMatchable), {
    minScore: POSSIBLE_MATCH - PREFILTER_SLACK,
  });
  const lostById = new Map(openLost.map((l) => [l.id, l]));

  // ...then score exactly as their matches page does, so the live score equals a reload.
  for (const { lostId } of candidates) {
    const lost = lostById.get(lostId)!;
    const { shown } = await getMatchesForLost(lost);
    const view = shown.find((v) => v.found.id === report.id);
    if (view) publishToLost(lostId, { type: "match.found", view });
  }
}

/** Called after "I got it back": update open pages everywhere. */
export function notifyResolved(lostId: string, foundId: string | null): void {
  publishToLost(lostId, { type: "lost.resolved" });
  if (foundId) publishPublic({ type: "report.resolved", foundIds: [foundId] });
}
