import { Skeleton } from "@heroui/react";
import { connection } from "next/server";
import { getOpenFoundReports } from "@/lib/queries";
import { LiveFoundGrid } from "./LiveFoundGrid";

/**
 * Open found reports from the database, then kept live over SSE.
 * Render inside <Suspense>.
 */
export async function FoundList({ limit }: { limit?: number }) {
  await connection(); // always fresh data, rendered at request time
  const reports = await getOpenFoundReports(limit);
  return <LiveFoundGrid initial={reports} limit={limit} />;
}

export function FoundListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading found items">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}
