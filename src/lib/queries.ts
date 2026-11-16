import "server-only";
import type { Report } from "@/generated/prisma/client";
import { REPORT_EXPIRY_DAYS } from "./constants";
import { db } from "./db";
import { matchesForLost, type MatchableReport, type MatchResult } from "./matching/score";
import { DATE_GRACE_DAYS } from "./matching/score";
import { toPublicReport } from "./reports";
import { tokenSchema } from "./schemas";
import type { PublicReport } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reports older than this were never closed and count as expired. */
function expiryCutoff(): Date {
  return new Date(Date.now() - REPORT_EXPIRY_DAYS * DAY_MS);
}

export function toMatchable(r: Report): MatchableReport {
  return {
    id: r.id,
    category: r.category,
    color: r.color,
    location: r.location,
    date: r.date,
    description: r.description,
  };
}

/** Open, non-expired found reports, newest first. Public data only. */
export async function getOpenFoundReports(limit?: number): Promise<PublicReport[]> {
  const rows = await db.report.findMany({
    where: { type: "FOUND", status: "OPEN", createdAt: { gte: expiryCutoff() } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toPublicReport);
}

/** The lost report behind a private link, or null for an unknown/malformed token. */
export async function getLostByToken(token: string) {
  if (!tokenSchema.safeParse(token).success) return null;
  return db.report.findFirst({ where: { token, type: "LOST" }, include: { resolvedWith: true } });
}

/** OPEN reports older than REPORT_EXPIRY_DAYS count as expired (checked at read time, no cron). */
export function isExpired(r: Pick<Report, "status" | "createdAt">): boolean {
  return r.status === "EXPIRED" || (r.status === "OPEN" && r.createdAt < expiryCutoff());
}

export type MatchView = {
  match: MatchResult;
  found: PublicReport;
  /** Finder's contact. Only revealed for strong matches (see README: privacy). */
  finderContact: string | null;
};

export type MatchesForLost = {
  shown: MatchView[];
  /** Weak matches hidden unless the user asks for them. */
  hiddenWeakCount: number;
};

/** Score every open found report against one lost report. */
export async function getMatchesForLost(
  lost: Report,
  { includeWeak = false }: { includeWeak?: boolean } = {},
): Promise<MatchesForLost> {
  // Pre-filter in SQL: open, not expired, not found clearly before the loss.
  const candidates = await db.report.findMany({
    where: {
      type: "FOUND",
      status: "OPEN",
      createdAt: { gte: expiryCutoff() },
      date: { gte: new Date(lost.date.getTime() - DATE_GRACE_DAYS * DAY_MS) },
    },
  });

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const all = matchesForLost(toMatchable(lost), candidates.map(toMatchable), { minScore: 1 });
  const visible = all.filter((m) => includeWeak || m.strength !== "weak");

  return {
    shown: visible.map((match) => {
      const found = byId.get(match.foundId)!;
      return {
        match,
        found: toPublicReport(found),
        finderContact: match.strength === "strong" ? found.contact : null,
      };
    }),
    hiddenWeakCount: all.length - visible.length,
  };
}
