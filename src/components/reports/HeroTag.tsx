import { connection } from "next/server";
import { getOpenFoundReports } from "@/lib/queries";
import type { PublicReport } from "@/lib/types";
import { ReportCard } from "./ReportCard";

/** Shown while loading, or when nothing has been found yet. */
const EXAMPLE: PublicReport = {
  id: "example",
  type: "FOUND",
  category: "BAG",
  color: "black",
  location: "library-entrance",
  date: "2026-01-12T00:00:00.000Z",
  description: "Dark backpack left on a bench by the library entrance.",
};

function Hanging({ report, caption }: { report: PublicReport; caption: string }) {
  return (
    <figure className="flex flex-col gap-3">
      <ReportCard report={report} className="claim-tag-swing w-full max-w-sm" />
      <figcaption className="text-muted pl-2 text-sm">{caption}</figcaption>
    </figure>
  );
}

/** The newest real found item, hanging like a tag on the office board. */
export async function HeroTag() {
  await connection();
  const [latest] = await getOpenFoundReports(1);
  return latest ? (
    <Hanging report={latest} caption="Most recently handed in" />
  ) : (
    <Hanging report={EXAMPLE} caption="Example: this is how found items are listed" />
  );
}

export function HeroTagFallback() {
  return <Hanging report={EXAMPLE} caption="Loading the latest found item…" />;
}
