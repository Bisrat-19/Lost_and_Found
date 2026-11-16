import type { Category, ReportType } from "@/generated/prisma/enums";
import type { MatchResult } from "./matching/score";

/** A found report as one of a lost report's matches. Safe to send to the owner's browser. */
export type MatchView = {
  match: MatchResult;
  found: PublicReport;
  /** Finder's contact. Only revealed for strong matches (see README: privacy). */
  finderContact: string | null;
};

/** Fields safe to show to anyone. Never includes contact or token. */
export type PublicReport = {
  id: string;
  type: ReportType;
  category: Category;
  color: string | null;
  location: string;
  date: string; // ISO string: serialisable from server to client
  description: string;
};
