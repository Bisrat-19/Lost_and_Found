"use client";

import { Chip } from "@heroui/react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLiveFeed } from "@/context/LiveFeedContext";
import type { MatchView } from "@/lib/types";
import { MatchCard } from "./MatchCard";

type LiveMatchesProps = {
  token: string;
  initial: MatchView[];
  hiddenWeakCount: number;
  includeWeak: boolean;
};

/**
 * Server-rendered matches + matches pushed live over SSE.
 * Items another owner already claimed disappear; the list stays sorted by score.
 */
export function LiveMatches({ token, initial, hiddenWeakCount, includeWeak }: LiveMatchesProps) {
  const { newMatches, resolvedFoundIds } = useLiveFeed();
  const newIds = new Set(newMatches.map((v) => v.found.id));
  const hidden = new Set(resolvedFoundIds);

  const seen = new Set<string>();
  const views = [...newMatches, ...initial]
    .filter((v) => !hidden.has(v.found.id) && !seen.has(v.found.id) && seen.add(v.found.id))
    .sort((a, b) => b.match.score - a.match.score);
  const strong = views.filter((v) => v.match.strength === "strong").length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-muted text-sm font-medium uppercase tracking-wide">Best matches first</h2>
        <p className="text-muted text-sm" aria-live="polite">
          {views.length === 0
            ? "No likely matches yet"
            : `${views.length} match${views.length === 1 ? "" : "es"}${strong ? `, ${strong} strong` : ""}`}
        </p>
      </div>

      {views.length === 0 ? (
        <EmptyState
          title="Nothing matches yet"
          description="Keep this page open: new found items are compared with your report and appear here instantly. Or save the link and check back."
          action={
            <ButtonLink href="/found" variant="outline" size="sm">
              Browse all found items
            </ButtonLink>
          }
        />
      ) : (
        views.map((view) => (
          <div key={view.found.id} className="flex flex-col gap-1">
            {newIds.has(view.found.id) ? (
              <Chip size="sm" color="accent" variant="soft" className="self-start">
                New since you opened this page
              </Chip>
            ) : null}
            <MatchCard view={view} token={token} />
          </div>
        ))
      )}

      {hiddenWeakCount > 0 && !includeWeak ? (
        <ButtonLink href="?all=1" variant="ghost" size="sm" className="self-start" scroll={false}>
          Show {hiddenWeakCount} weaker match{hiddenWeakCount === 1 ? "" : "es"}
        </ButtonLink>
      ) : null}
      {includeWeak ? (
        <ButtonLink href="?" variant="ghost" size="sm" className="self-start" scroll={false}>
          Hide weaker matches
        </ButtonLink>
      ) : null}
    </section>
  );
}
