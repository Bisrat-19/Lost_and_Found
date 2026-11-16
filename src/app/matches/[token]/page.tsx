import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert, Skeleton } from "@heroui/react";
import { MatchCard } from "@/components/matches/MatchCard";
import { ResolveButton } from "@/components/matches/ResolveButton";
import { ReportCard } from "@/components/reports/ReportCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_LABELS, REPORT_EXPIRY_DAYS } from "@/lib/constants";
import { getLostByToken, getMatchesForLost, isExpired } from "@/lib/queries";
import { toPublicReport } from "@/lib/reports";

export const metadata: Metadata = {
  title: "Your matches · Lost & Found",
  // Private page: keep it out of search engines, and don't leak the token in Referer headers
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MatchesPage(props: PageProps<"/matches/[token]">) {
  return (
    <Suspense fallback={<MatchesSkeleton />}>
      <Matches {...props} />
    </Suspense>
  );
}

async function Matches({ params, searchParams }: PageProps<"/matches/[token]">) {
  await connection();
  const { token } = await params;
  const { all } = await searchParams;
  const includeWeak = all === "1";

  const lost = await getLostByToken(token);
  if (!lost) notFound();

  if (lost.status === "RESOLVED") return <ResolvedView lost={lost} />;
  if (isExpired(lost)) return <ExpiredView lost={lost} />;

  const { shown, hiddenWeakCount } = await getMatchesForLost(lost, { includeWeak });
  const strong = shown.filter((v) => v.match.strength === "strong").length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Matches for your {CATEGORY_LABELS[lost.category].toLowerCase()}
        </h1>
        <p className="text-muted">
          {shown.length === 0
            ? "No likely matches yet."
            : `${shown.length} possible match${shown.length === 1 ? "" : "es"}${strong ? `, ${strong} strong` : ""}.`}{" "}
          This page is private. Only people with this link can see it.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium uppercase tracking-wide">Your report</h2>
        <ReportCard
          report={toPublicReport(lost)}
          footer={
            <ResolveButton
              token={token}
              foundId={null}
              label="I got it back another way"
              variant="ghost"
            />
          }
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-muted text-sm font-medium uppercase tracking-wide">Best matches first</h2>
        {shown.length === 0 ? (
          <EmptyState
            title="Nothing matches yet"
            description="New found items are compared with your report as they come in. Keep this link and check back."
            action={
              <ButtonLink href="/found" variant="outline" size="sm">
                Browse all found items
              </ButtonLink>
            }
          />
        ) : (
          shown.map((view) => <MatchCard key={view.found.id} view={view} token={token} />)
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
    </div>
  );
}

type LostWithResolution = NonNullable<Awaited<ReturnType<typeof getLostByToken>>>;

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function ResolvedView({ lost }: { lost: LostWithResolution }) {
  return (
    <div className="flex flex-col gap-6">
      <Alert status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>You got it back. This report is closed</Alert.Title>
          <Alert.Description>
            Marked as returned{lost.resolvedAt ? ` on ${dateFmt.format(lost.resolvedAt)}` : ""}.
            It no longer appears in matching
            {lost.resolvedWith ? ", and the matched found item was removed from the public list" : ""}.
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium uppercase tracking-wide">Your report</h2>
        <ReportCard report={toPublicReport(lost)} />
      </section>
      {lost.resolvedWith ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-muted text-sm font-medium uppercase tracking-wide">Returned item</h2>
          <ReportCard report={toPublicReport(lost.resolvedWith)} />
        </section>
      ) : null}
    </div>
  );
}

function ExpiredView({ lost }: { lost: LostWithResolution }) {
  return (
    <div className="flex flex-col gap-6">
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>This report has expired</Alert.Title>
          <Alert.Description>
            Reports close automatically after {REPORT_EXPIRY_DAYS} days. If you&apos;re still looking,
            please report the item again.
          </Alert.Description>
        </Alert.Content>
      </Alert>
      <ReportCard report={toPublicReport(lost)} />
      <ButtonLink href="/lost/new" className="self-start">
        Report it again
      </ButtonLink>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading matches">
      <Skeleton className="h-8 w-72 rounded-lg" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
