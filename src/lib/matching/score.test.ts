import { describe, expect, it } from "vitest";
import { POSSIBLE_MATCH, STRONG_MATCH } from "@/lib/constants";
import {
  colorSignal,
  daysBetween,
  locationSignal,
  matchesForFound,
  matchesForLost,
  scorePair,
  timeSignal,
  WEIGHTS,
  type MatchableReport,
} from "./score";
import { buildIdf, colorFromText, cosine, tfidfVector, tokenize } from "./text";

// Monday 2026-11-09 as the reference day
const MON = new Date("2026-11-09T00:00:00Z");
const daysAfter = (n: number) => new Date(MON.getTime() + n * 86_400_000);

let seq = 0;
function report(p: Partial<MatchableReport>): MatchableReport {
  return {
    id: `r${++seq}`,
    category: "BAG",
    color: null,
    location: "library",
    date: MON,
    description: "item",
    ...p,
  };
}

// ---------------------------------------------------------------------------
// Examples taken straight from the assessment brief
// ---------------------------------------------------------------------------
describe("brief examples", () => {
  const lostBackpack = report({
    category: "BAG",
    color: "black",
    location: "library",
    date: MON,
    description: "Black backpack containing a laptop charger. Lost around the library on Monday afternoon.",
  });

  it("dark backpack at the library entrance the same evening → STRONG", () => {
    const found = report({
      category: "BAG",
      color: null, // finder didn't pick a colour, but wrote "dark-colored"
      location: "library-entrance",
      date: MON,
      description: "Dark-colored backpack found near the library entrance Monday evening.",
    });
    const m = scorePair(lostBackpack, found)!;
    expect(m.score).toBeGreaterThanOrEqual(STRONG_MATCH);
    expect(m.strength).toBe("strong");
    const texts = m.reasons.map((r) => r.text).join(" | ");
    expect(texts).toMatch(/Similar colour: black ≈ dark \(from the description\)/);
    expect(texts).toMatch(/same area/);
  });

  it("black backpack at the football field two weeks later → POSSIBLE, with the doubts explained", () => {
    const found = report({
      category: "BAG",
      color: "black",
      location: "football-field",
      date: daysAfter(14),
      description: "Black backpack found at the football field.",
    });
    const m = scorePair(lostBackpack, found)!;
    expect(m.strength).toBe("possible");
    const negatives = m.reasons.filter((r) => r.tone === "negative").map((r) => r.signal);
    expect(negatives).toEqual(expect.arrayContaining(["location", "time"]));
  });

  it("black AirPods case vs dark wireless earbud case by the coffee shop → STRONG", () => {
    const lost = report({
      category: "EARBUDS",
      color: "black",
      location: "cafeteria",
      date: MON,
      description: "I lost my black AirPods case yesterday near the cafeteria.",
    });
    const found = report({
      category: "EARBUDS",
      color: null,
      location: "coffee-shop",
      date: daysAfter(1),
      description: "Found a dark wireless earbud case beside the coffee shop.",
    });
    const m = scorePair(lost, found)!;
    expect(m.strength).toBe("strong");
    expect(m.reasons.find((r) => r.signal === "text")!.text).toMatch(/earbud/);
  });
});

// ---------------------------------------------------------------------------
// Hard rules
// ---------------------------------------------------------------------------
describe("hard rules", () => {
  it("excludes items found clearly before they were lost", () => {
    const lost = report({ date: MON });
    expect(scorePair(lost, report({ date: daysAfter(-3) }))).toBeNull();
  });

  it("allows 1 day of grace for date mistakes", () => {
    const lost = report({ date: MON });
    expect(scorePair(lost, report({ date: daysAfter(-1) }))).not.toBeNull();
  });

  it("unrelated categories never reach 'possible', even if everything else matches", () => {
    const lost = report({ category: "PHONE", color: "black", description: "black phone with cracked screen" });
    const found = report({ category: "BAG", color: "black", description: "black bag with cracked screen" });
    const m = scorePair(lost, found)!;
    expect(m.score).toBeLessThan(POSSIBLE_MATCH);
    expect(m.strength).toBe("weak");
  });

  it("related categories (wallet vs ID card) get partial credit and can still match", () => {
    const lost = report({ category: "WALLET", color: "brown", description: "brown leather wallet with my student ID card" });
    const found = report({ category: "ID_CARD", color: "brown", description: "student ID card in a brown leather holder" });
    const m = scorePair(lost, found)!;
    expect(m.score).toBeGreaterThanOrEqual(POSSIBLE_MATCH);
  });

  it("score stays within 0–100 and points never exceed their max", () => {
    const a = report({ color: "red", description: "red bag" });
    const m = scorePair(a, { ...a, id: "copy" })!;
    expect(m.score).toBe(100);
    for (const r of m.reasons) expect(r.points).toBeLessThanOrEqual(r.max);
  });
});

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------
describe("signals", () => {
  it("colour: exact, similar, different, unknown", () => {
    const c = (a: string | null, b: string | null) =>
      colorSignal(report({ color: a, description: "x" }), report({ color: b, description: "x" })).points;
    expect(c("black", "black")).toBe(WEIGHTS.color);
    expect(c("black", "navy")).toBeGreaterThan(0);
    expect(c("black", "navy")).toBeLessThan(WEIGHTS.color);
    expect(c("black", "red")).toBe(0);
    // unknown is neutral: some points, not zero (don't punish missing info)
    expect(c(null, "red")).toBeGreaterThan(0);
    expect(c(null, "red")).toBeLessThan(c("black", "navy"));
  });

  it("location: same place > same zone > unknown > different zone", () => {
    const p = (a: string, b: string) => locationSignal(a, b).points;
    expect(p("library", "library")).toBe(WEIGHTS.location);
    expect(p("library", "library-entrance")).toBeLessThan(WEIGHTS.location);
    expect(p("library", "other")).toBeLessThan(p("library", "library-entrance"));
    expect(p("library", "other")).toBeGreaterThan(0);
    expect(p("library", "football-field")).toBe(0);
  });

  it("time: full within 3 days, fades to 0 at 14 days", () => {
    expect(timeSignal(0).points).toBe(WEIGHTS.time);
    expect(timeSignal(3).points).toBe(WEIGHTS.time);
    expect(timeSignal(8).points).toBeGreaterThan(0);
    expect(timeSignal(8).points).toBeLessThan(WEIGHTS.time);
    expect(timeSignal(14).points).toBe(0);
    expect(timeSignal(30).points).toBe(0);
  });

  it("daysBetween counts whole days", () => {
    expect(daysBetween(MON, daysAfter(2))).toBe(2);
    expect(daysBetween(MON, daysAfter(-1))).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Text processing
// ---------------------------------------------------------------------------
describe("text", () => {
  it("tokenize: removes stopwords, colours, places; strips plurals; maps synonyms", () => {
    expect(tokenize("I lost my black AirPods near the Library on Monday")).toEqual(["earbud"]);
    expect(tokenize("Two keys on a keychain")).toEqual(["two", "key", "key"]);
    expect(tokenize("Dark-colored Backpack!!")).toEqual(["bag"]);
    expect(tokenize("glasses, sunglasses, boxes, watches, cards")).toEqual([
      "glass",
      "glass",
      "box",
      "watch",
      "card",
    ]);
    expect(tokenize("glass bus")).toEqual(["glass"]); // "ss"/"us" endings are not plurals ("bus" is a place stopword)
  });

  it("colorFromText finds the first colour word, including vague shades", () => {
    expect(colorFromText("A dark-colored backpack")).toBe("dark");
    expect(colorFromText("gray hoodie")).toBe("grey");
    expect(colorFromText("a backpack")).toBeNull();
  });

  it("cosine: identical = 1, nothing shared = 0", () => {
    const a = tokenize("laptop charger cable");
    const b = tokenize("water bottle");
    const idf = buildIdf([a, b]);
    expect(cosine(tfidfVector(a, idf), tfidfVector(a, idf))).toBeCloseTo(1);
    expect(cosine(tfidfVector(a, idf), tfidfVector(b, idf))).toBe(0);
  });

  it("smoothed idf keeps words shared by every document above zero", () => {
    const a = tokenize("bag charger");
    const b = tokenize("bag");
    const idf = buildIdf([a, b]);
    expect(idf.get("bag")).toBeGreaterThan(0);
    expect(cosine(tfidfVector(a, idf), tfidfVector(b, idf))).toBeGreaterThan(0);
  });

  it("rare words weigh more than common ones", () => {
    const idf = buildIdf([["bag"], ["bag"], ["bag", "charger"]]);
    expect(idf.get("charger")!).toBeGreaterThan(idf.get("bag")!);
  });
});

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------
describe("ranking", () => {
  const lost = report({ category: "BAG", color: "black", location: "library", description: "black backpack with laptop charger" });
  const strong = report({ category: "BAG", color: "black", location: "library", description: "black backpack, has a charger inside" });
  const possible = report({ category: "BAG", color: "black", location: "gym", date: daysAfter(9), description: "backpack" });
  const weak = report({ category: "PHONE", color: "white", location: "gym", description: "white phone" });
  const impossible = report({ category: "BAG", color: "black", date: daysAfter(-10), description: "black backpack charger" });

  it("matchesForLost sorts by score and hides weak + impossible by default", () => {
    const res = matchesForLost(lost, [weak, possible, impossible, strong]);
    expect(res.map((r) => r.foundId)).toEqual([strong.id, possible.id]);
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });

  it("minScore: 0 includes weak matches; limit caps the list", () => {
    expect(matchesForLost(lost, [weak, possible, strong], { minScore: 0 })).toHaveLength(3);
    expect(matchesForLost(lost, [weak, possible, strong], { limit: 1 })).toHaveLength(1);
  });

  it("matchesForFound finds the lost reports a new found item could belong to", () => {
    const otherLost = report({ category: "KEYS", color: "silver", description: "car keys" });
    const res = matchesForFound(strong, [otherLost, lost]);
    expect(res).toHaveLength(1);
    expect(res[0].lostId).toBe(lost.id);
    expect(res[0].foundId).toBe(strong.id);
  });

  it("empty candidate list → no matches", () => {
    expect(matchesForLost(lost, [])).toEqual([]);
  });
});
