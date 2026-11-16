import type { Metadata } from "next";
import { Suspense } from "react";
import { FoundList, FoundListSkeleton } from "@/components/reports/FoundList";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = { title: "Found items · Lost & Found" };

export default function FoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl sm:text-4xl">Found items</h1>
          <p className="text-muted max-w-2xl">
            Items other students have found on campus. Contact details are never shown here.
            Report your lost item to get a private, scored list of likely matches.
          </p>
        </div>
        <ButtonLink href="/lost/new">I lost something</ButtonLink>
      </header>
      <Suspense fallback={<FoundListSkeleton />}>
        <FoundList />
      </Suspense>
    </div>
  );
}
