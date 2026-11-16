// Scores how likely a found report is the item described in a lost report.
//
// Score = sum of five weighted signals (max 100). Every signal also produces a
// human-readable reason, so a person can check *why* two reports matched.
//
// Pure functions: no database, no I/O. Easy to test and to tune.

import type { Category } from "@/generated/prisma/enums";
import {
  CATEGORY_LABELS,
  LOCATION_BY_ID,
  locationLabel,
  matchStrength,
  POSSIBLE_MATCH,
  type LocationId,
  type MatchStrength,
} from "@/lib/constants";
import { COLOR_GROUPS, RELATED_CATEGORIES } from "./synonyms";
import { buildIdf, colorFromText, cosine, sharedTerms, tfidfVector, tokenize, type Idf } from "./text";

/** Maximum points per signal. Sums to 100. */
export const WEIGHTS = {
  category: 30,
  text: 25,
  color: 15,
  location: 15,
  time: 15,
} as const;

/**
 * Cosine similarity at or above this counts as a full text match. Short texts
 * rarely reach 1.0, but sharing only the item noun ("bag") gives ~0.45, so a
 * low value here would over-reward that and double-count the category signal.
 */
export const TEXT_FULL_AT = 0.8;
/** Found up to this many days after the loss gets full time points... */
export const TIME_FULL_DAYS = 3;
/** ...fading linearly to zero at this many days. */
export const TIME_ZERO_DAYS = 14;
/** A found date this many days *before* the loss is still allowed (typos, time zones). */
export const DATE_GRACE_DAYS = 1;
/** Unrelated categories can never reach "possible": cap the total here. */
export const UNRELATED_CATEGORY_CAP = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type MatchableReport = {
  id: string;
  category: Category;
  color: string | null;
  location: string;
  date: Date;
  description: string;
};

export type Signal = keyof typeof WEIGHTS;

export type Reason = {
  signal: Signal;
  points: number;
  max: number;
  /** positive = supports the match, negative = argues against, neutral = no info */
  tone: "positive" | "neutral" | "negative";
  text: string;
};

export type MatchResult = {
  lostId: string;
  foundId: string;
  score: number; // 0–100, rounded
  strength: MatchStrength;
  reasons: Reason[];
};

// ---------------------------------------------------------------------------
// Individual signals
// ---------------------------------------------------------------------------

function isRelatedCategory(a: Category, b: Category): boolean {
  return RELATED_CATEGORIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * @param descriptionsOverlap whether the descriptions share any key word. An
 *   "Other" report only earns category points when the text backs it up;
 *   otherwise "Other" would partly match everything found nearby.
 */
export function categorySignal(
  lost: Category,
  found: Category,
  descriptionsOverlap = true,
): Reason & { unrelated: boolean } {
  const max = WEIGHTS.category;
  if (lost === found) {
    return { signal: "category", points: max, max, tone: "positive", unrelated: false, text: `Same type of item: ${CATEGORY_LABELS[lost]}` };
  }
  if (lost === "OTHER" || found === "OTHER") {
    if (!descriptionsOverlap) {
      return { signal: "category", points: 0, max, tone: "negative", unrelated: true, text: `One report is "Other" and the descriptions have nothing in common` };
    }
    return { signal: "category", points: Math.round(max / 3), max, tone: "neutral", unrelated: false, text: `One report is "Other", so we rely on the description` };
  }
  if (isRelatedCategory(lost, found)) {
    return { signal: "category", points: Math.round(max * 0.5), max, tone: "neutral", unrelated: false, text: `Related types: ${CATEGORY_LABELS[lost]} vs ${CATEGORY_LABELS[found]}` };
  }
  return { signal: "category", points: 0, max, tone: "negative", unrelated: true, text: `Different type of item: ${CATEGORY_LABELS[lost]} vs ${CATEGORY_LABELS[found]}` };
}

function colorsSimilar(a: string, b: string): boolean {
  return COLOR_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

/** Use the colour field; if it's empty, fall back to a colour word in the description. */
function effectiveColor(r: MatchableReport): { color: string | null; inferred: boolean } {
  if (r.color) return { color: r.color, inferred: false };
  const fromText = colorFromText(r.description);
  return { color: fromText, inferred: fromText !== null };
}

export function colorSignal(lost: MatchableReport, found: MatchableReport): Reason {
  const max = WEIGHTS.color;
  const a = effectiveColor(lost);
  const b = effectiveColor(found);
  const note = a.inferred || b.inferred ? " (from the description)" : "";

  if (!a.color || !b.color) {
    return { signal: "color", points: Math.round(max / 3), max, tone: "neutral", text: "Colour unknown on one report" };
  }
  if (a.color === b.color) {
    return { signal: "color", points: max, max, tone: "positive", text: `Same colour: ${a.color}${note}` };
  }
  if (colorsSimilar(a.color, b.color)) {
    return { signal: "color", points: Math.round(max * 0.67), max, tone: "positive", text: `Similar colour: ${a.color} ≈ ${b.color}${note}` };
  }
  return { signal: "color", points: 0, max, tone: "negative", text: `Different colour: ${a.color} vs ${b.color}${note}` };
}

export function locationSignal(lost: string, found: string): Reason {
  const max = WEIGHTS.location;
  const a = LOCATION_BY_ID[lost as LocationId];
  const b = LOCATION_BY_ID[found as LocationId];

  if (lost === found) {
    return { signal: "location", points: max, max, tone: "positive", text: `Same place: ${locationLabel(lost)}` };
  }
  if (!a || !b || a.zone === "unknown" || b.zone === "unknown") {
    return { signal: "location", points: Math.round(max / 3), max, tone: "neutral", text: "Location not certain on one report" };
  }
  if (a.zone === b.zone) {
    return { signal: "location", points: Math.round(max * 0.67), max, tone: "positive", text: `Nearby: ${a.label} and ${b.label} are in the same area` };
  }
  return { signal: "location", points: 0, max, tone: "negative", text: `Different area: ${a.label} vs ${b.label}` };
}

/** Whole days from lost date to found date (negative = found before lost). */
export function daysBetween(lost: Date, found: Date): number {
  return Math.round((found.getTime() - lost.getTime()) / DAY_MS);
}

export function timeSignal(days: number): Reason {
  const max = WEIGHTS.time;
  const when =
    days <= 0 ? "the same day" : days === 1 ? "1 day later" : `${days} days later`;

  if (days <= TIME_FULL_DAYS) {
    return { signal: "time", points: max, max, tone: "positive", text: `Found ${when}` };
  }
  if (days >= TIME_ZERO_DAYS) {
    return { signal: "time", points: 0, max, tone: "negative", text: `Found ${when}, a long time after it was lost` };
  }
  const fraction = 1 - (days - TIME_FULL_DAYS) / (TIME_ZERO_DAYS - TIME_FULL_DAYS);
  const points = Math.round(max * fraction * 10) / 10;
  return { signal: "time", points, max, tone: points >= max / 2 ? "positive" : "neutral", text: `Found ${when}` };
}

export function textSignal(lostTokens: string[], foundTokens: string[], idf: Idf): Reason {
  const max = WEIGHTS.text;
  const sim = cosine(tfidfVector(lostTokens, idf), tfidfVector(foundTokens, idf));
  const points = Math.round(max * Math.min(1, sim / TEXT_FULL_AT) * 10) / 10;
  const shared = sharedTerms(lostTokens, foundTokens);

  if (shared.length === 0) {
    return { signal: "text", points, max, tone: "neutral", text: "Descriptions have no key words in common" };
  }
  return {
    signal: "text",
    points,
    max,
    tone: points >= max / 2 ? "positive" : "neutral",
    text: `Descriptions share: ${shared.slice(0, 5).join(", ")}`,
  };
}

// ---------------------------------------------------------------------------
// Combine
// ---------------------------------------------------------------------------

/**
 * Score one lost/found pair. Returns null when the pair is impossible
 * (found clearly before it was lost).
 *
 * `idf` should be built from all reports being compared (see rankMatches);
 * if omitted, it is built from just this pair.
 */
export function scorePair(lost: MatchableReport, found: MatchableReport, idf?: Idf): MatchResult | null {
  const days = daysBetween(lost.date, found.date);
  if (days < -DATE_GRACE_DAYS) return null;

  const lostTokens = tokenize(lost.description);
  const foundTokens = tokenize(found.description);
  const corpusIdf = idf ?? buildIdf([lostTokens, foundTokens]);

  const overlap = sharedTerms(lostTokens, foundTokens).length > 0;
  const category = categorySignal(lost.category, found.category, overlap);
  const reasons: Reason[] = [
    { signal: category.signal, points: category.points, max: category.max, tone: category.tone, text: category.text },
    textSignal(lostTokens, foundTokens, corpusIdf),
    colorSignal(lost, found),
    locationSignal(lost.location, found.location),
    timeSignal(days),
  ];

  let score = reasons.reduce((sum, r) => sum + r.points, 0);
  if (category.unrelated) score = Math.min(score, UNRELATED_CATEGORY_CAP);
  score = Math.round(Math.max(0, Math.min(100, score)));

  return { lostId: lost.id, foundId: found.id, score, strength: matchStrength(score), reasons };
}

export type RankOptions = {
  /** Hide results below this score. Defaults to the "possible" threshold. */
  minScore?: number;
  limit?: number;
};

function rank(results: (MatchResult | null)[], { minScore = POSSIBLE_MATCH, limit }: RankOptions) {
  const kept = results
    .filter((r): r is MatchResult => r !== null && r.score >= minScore)
    .sort((a, b) => b.score - a.score);
  return limit ? kept.slice(0, limit) : kept;
}

/** IDF over the whole comparison set, so common words ("bag") weigh less than rare ones ("charger"). */
function corpusIdf(reports: readonly MatchableReport[]): Idf {
  return buildIdf(reports.map((r) => tokenize(r.description)));
}

/** Best found reports for one lost report, highest score first. */
export function matchesForLost(lost: MatchableReport, found: readonly MatchableReport[], opts: RankOptions = {}) {
  const idf = corpusIdf([lost, ...found]);
  return rank(found.map((f) => scorePair(lost, f, idf)), opts);
}

/** Lost reports that a newly found item could belong to (used for live notifications). */
export function matchesForFound(found: MatchableReport, lost: readonly MatchableReport[], opts: RankOptions = {}) {
  const idf = corpusIdf([found, ...lost]);
  return rank(lost.map((l) => scorePair(l, found, idf)), opts);
}
