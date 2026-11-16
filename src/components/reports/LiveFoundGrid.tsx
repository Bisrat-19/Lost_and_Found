"use client";

import { Chip } from "@heroui/react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLiveFeed } from "@/context/LiveFeedContext";
import type { PublicReport } from "@/lib/types";
import { ReportCard } from "./ReportCard";

/**
 * Server-rendered found reports + live changes from the store:
 * new reports appear at the top (marked "New"), returned ones disappear.
 */
export function LiveFoundGrid({ initial, limit }: { initial: PublicReport[]; limit?: number }) {
  const { newFound, resolvedFoundIds } = useLiveFeed();
  const newIds = new Set(newFound.map((r) => r.id));
  const hidden = new Set(resolvedFoundIds);

  const seen = new Set<string>();
  const items = [...newFound, ...initial]
    .filter((r) => !hidden.has(r.id) && !seen.has(r.id) && seen.add(r.id))
    .slice(0, limit);

  if (items.length === 0) {
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
    <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
      {items.map((r) => (
        <ReportCard
          key={r.id}
          report={r}
          badge={
            newIds.has(r.id) ? (
              <Chip size="sm" color="accent" variant="soft">
                New
              </Chip>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
