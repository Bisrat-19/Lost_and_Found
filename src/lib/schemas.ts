// Input validation shared by forms (client) and API routes (server).
import { z } from "zod";
import {
  Category,
  COLORS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  LOCATION_IDS,
  MAX_REPORT_AGE_DAYS,
} from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Remove HTML tags and collapse whitespace, so stored text is plain and tidy. */
export function cleanText(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Empty select / "I don't know" → null
const optionalColor = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.enum(COLORS, { error: "Pick a colour from the list" }).nullable(),
);

const description = z
  .string({ error: "Description is required" })
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(DESCRIPTION_MIN, `Please describe the item in at least ${DESCRIPTION_MIN} characters`)
      .max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters`),
  );

// Accepts a Date or a date string ("2026-11-16"). Allows up to 1 day in the
// future to absorb timezone differences between browser and server.
// Empty / null is "missing", not 1970-01-01 (which z.coerce would produce).
const reportDate = z
  .unknown()
  .refine((v) => v !== undefined && v !== null && v !== "", { error: "Pick a date", abort: true })
  .pipe(
    z.coerce
      .date({ error: "Enter a valid date" })
      .refine((d) => d.getTime() <= Date.now() + DAY_MS, "Date can't be in the future")
      .refine(
        (d) => d.getTime() >= Date.now() - MAX_REPORT_AGE_DAYS * DAY_MS,
        `Date must be within the last ${MAX_REPORT_AGE_DAYS} days`,
      ),
  );

const email = z.email();
const phone = z.string().regex(/^\+?[0-9\s\-()]{7,20}$/);

/** Email or phone number. Trimmed; empty string treated as missing. */
const contact = z
  .string({ error: "Enter your email or phone number" })
  .transform((s) => s.trim())
  .refine((s) => email.safeParse(s).success || phone.safeParse(s).success, {
    error: "Enter a valid email or phone number",
  });

const baseReport = {
  category: z.enum(Category, { error: "Pick a category" }),
  color: optionalColor,
  location: z.enum(LOCATION_IDS, { error: "Pick a location" }),
  date: reportDate,
  description,
};

/** Lost report: contact is required so the owner can be reached later. */
export const lostReportSchema = z.object({
  type: z.literal("LOST"),
  ...baseReport,
  contact,
});

/** Found report: contact is optional (finder may hand the item to the office). */
export const foundReportSchema = z.object({
  type: z.literal("FOUND"),
  ...baseReport,
  contact: z.preprocess((v) => (v === "" ? undefined : v), contact.optional()),
});

/** One schema for the create endpoint, picked by `type`. */
export const createReportSchema = z.discriminatedUnion("type", [
  lostReportSchema,
  foundReportSchema,
]);

export type LostReportInput = z.infer<typeof lostReportSchema>;
export type FoundReportInput = z.infer<typeof foundReportSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;

/** Field → first error message, ready to show under form fields. */
export type FieldErrors = Partial<Record<string, string>>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Secret tokens in links: URL-safe, 16–64 chars. Rejects junk early. */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid link");
