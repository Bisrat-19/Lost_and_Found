import { describe, expect, it } from "vitest";
import type { MatchView, PublicReport } from "@/lib/types";
import { initialLiveState, liveReducer } from "./liveReducer";

const report = (id: string): PublicReport => ({
  id,
  type: "FOUND",
  category: "BAG",
  color: "black",
  location: "library",
  date: "2026-11-16T00:00:00.000Z",
  description: "black bag",
});

const view = (foundId: string, score: number): MatchView => ({
  found: report(foundId),
  finderContact: null,
  match: { lostId: "L", foundId, score, strength: score >= 70 ? "strong" : "possible", reasons: [] },
});

describe("liveReducer", () => {
  it("tracks connection status (and keeps the same object when unchanged)", () => {
    const open = liveReducer(initialLiveState, { type: "connection/changed", status: "open" });
    expect(open.connection).toBe("open");
    expect(liveReducer(open, { type: "connection/changed", status: "open" })).toBe(open);
  });

  it("adds new found reports newest-first and ignores duplicates (e.g. after reconnect)", () => {
    let s = liveReducer(initialLiveState, { type: "found/added", report: report("a") });
    s = liveReducer(s, { type: "found/added", report: report("b") });
    const again = liveReducer(s, { type: "found/added", report: report("a") });
    expect(s.newFound.map((r) => r.id)).toEqual(["b", "a"]);
    expect(again).toBe(s);
  });

  it("collects resolved ids without duplicates", () => {
    let s = liveReducer(initialLiveState, { type: "found/resolved", ids: ["a"] });
    s = liveReducer(s, { type: "found/resolved", ids: ["a", "b"] });
    expect(s.resolvedFoundIds).toEqual(["a", "b"]);
  });

  it("adds matches and replaces an existing one for the same found item", () => {
    let s = liveReducer(initialLiveState, { type: "match/added", view: view("x", 60) });
    s = liveReducer(s, { type: "match/added", view: view("y", 80) });
    s = liveReducer(s, { type: "match/added", view: view("x", 75) });
    expect(s.newMatches.map((v) => [v.found.id, v.match.score])).toEqual([
      ["x", 75],
      ["y", 80],
    ]);
  });

  it("never mutates the previous state", () => {
    const before = structuredClone(initialLiveState);
    liveReducer(initialLiveState, { type: "found/added", report: report("a") });
    expect(initialLiveState).toEqual(before);
  });
});
