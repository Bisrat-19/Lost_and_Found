import "server-only";
import { randomBytes } from "node:crypto";
import type { Report } from "@/generated/prisma/client";
import { db } from "./db";
import type { CreateReportInput } from "./schemas";
import type { PublicReport } from "./types";

/** 24 random bytes → 32 URL-safe chars. Unguessable, fits tokenSchema. */
export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Save a validated report. Lost reports get a secret token for their matches link. */
export async function createReport(input: CreateReportInput): Promise<Report> {
  return db.report.create({
    data: {
      type: input.type,
      category: input.category,
      color: input.color,
      location: input.location,
      date: input.date,
      description: input.description,
      contact: input.contact ?? null,
      token: input.type === "LOST" ? generateToken() : null,
    },
  });
}

/** Strip private fields (contact, token) before sending a report to the browser. */
export function toPublicReport(r: Report): PublicReport {
  return {
    id: r.id,
    type: r.type,
    category: r.category,
    color: r.color,
    location: r.location,
    date: r.date.toISOString(),
    description: r.description,
  };
}
