import { Skeleton } from "@heroui/react";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { getOpenFoundReports } from "@/lib/queries";
import { ReportCard } from "./ReportCard";

/** Open found reports from the database. Render inside <Suspense>. */
export async function FoundList({ limit }: { limit?: number }) {
  await connection(); // always fresh data, rendered at request time
  const reports = await getOpenFoundReports(limit);

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No found items yet"
        description="Found something? Help it get back to its owner."
        action={
          <ButtonLink href="/found/new" variant="outline" size="sm">
            Report a found item
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  );
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
