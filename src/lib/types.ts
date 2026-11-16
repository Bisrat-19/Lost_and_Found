import type { Category, ReportType } from "@/generated/prisma/enums";

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
