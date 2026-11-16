import { describe, expect, it } from "vitest";
import { cleanText, createReportSchema, toFieldErrors, tokenSchema } from "./schemas";

const DAY = 24 * 60 * 60 * 1000;
const today = () => new Date().toISOString().slice(0, 10);

const validLost = {
  type: "LOST",
  category: "BAG",
  color: "black",
  location: "library",
  date: today(),
  description: "Black backpack containing a laptop charger",
  contact: "student@uni.edu",
};

const validFound = {
  type: "FOUND",
  category: "BAG",
  color: "",
  location: "library-entrance",
  date: today(),
  description: "Dark-colored backpack near the library entrance",
  contact: "",
};

function errorsOf(input: unknown) {
  const r = createReportSchema.safeParse(input);
  return r.success ? {} : toFieldErrors(r.error);
}

describe("createReportSchema", () => {
  it("accepts a valid lost report", () => {
    const r = createReportSchema.parse(validLost);
    expect(r.type).toBe("LOST");
    expect(r.date).toBeInstanceOf(Date);
  });

  it("accepts a found report with no colour and no contact", () => {
    const r = createReportSchema.parse(validFound);
    expect(r.color).toBeNull();
    expect(r.contact).toBeUndefined();
  });

  it("requires contact on lost reports", () => {
    expect(errorsOf({ ...validLost, contact: "" }).contact).toBeDefined();
  });

  it("accepts a phone number as contact", () => {
    expect(createReportSchema.safeParse({ ...validLost, contact: "+251 911 234 567" }).success).toBe(
      true,
    );
  });

  it("rejects unknown category, colour and location", () => {
    const e = errorsOf({ ...validLost, category: "CAR", color: "rainbow", location: "mars" });
    expect(Object.keys(e).sort()).toEqual(["category", "color", "location"]);
  });

  it("rejects future dates and very old dates", () => {
    const future = new Date(Date.now() + 3 * DAY).toISOString();
    const old = new Date(Date.now() - 120 * DAY).toISOString();
    expect(errorsOf({ ...validLost, date: future }).date).toMatch(/future/);
    expect(errorsOf({ ...validLost, date: old }).date).toMatch(/90 days/);
    expect(errorsOf({ ...validLost, date: "not-a-date" }).date).toBeDefined();
  });

  it("rejects too-short descriptions after cleaning", () => {
    expect(errorsOf({ ...validLost, description: "  <b>bag</b>   " }).description).toMatch(
      /at least/,
    );
  });

  it("strips HTML from descriptions", () => {
    const r = createReportSchema.parse({
      ...validLost,
      description: "<script>x</script>Black   backpack with charger",
    });
    expect(r.description).toBe("x Black backpack with charger");
  });

  it("rejects an unknown report type", () => {
    expect(createReportSchema.safeParse({ ...validLost, type: "STOLEN" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("cleanText collapses whitespace", () => {
    expect(cleanText("  a \n\n b\t c ")).toBe("a b c");
  });

  it("tokenSchema accepts url-safe tokens and rejects junk", () => {
    expect(tokenSchema.safeParse("abcDEF123_-abcDEF123").success).toBe(true);
    expect(tokenSchema.safeParse("short").success).toBe(false);
    expect(tokenSchema.safeParse("../../etc/passwd-xxxxxxxx").success).toBe(false);
  });
});
