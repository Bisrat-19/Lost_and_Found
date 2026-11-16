import { ReportCard } from "@/components/reports/ReportCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import type { MatchView } from "@/lib/queries";
import { MatchReasons } from "./MatchReasons";

/** A found report shown as a match: score badge + reasons + (strong only) how to reach the finder. */
export function MatchCard({ view }: { view: MatchView }) {
  const { match, found, finderContact } = view;
  return (
    <ReportCard
      report={found}
      badge={<ScoreBadge score={match.score} />}
      footer={
        <div className="flex w-full flex-col gap-3">
          <MatchReasons reasons={match.reasons} />
          {match.strength === "strong" ? (
            <p className="bg-default/40 rounded-lg px-3 py-2 text-sm">
              {finderContact ? (
                <>
                  Contact the finder: <span className="font-medium">{finderContact}</span>. Be ready
                  to describe a detail that isn&apos;t in the listing.
                </>
              ) : (
                <>The finder left no contact. Ask at the campus lost &amp; found office.</>
              )}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
