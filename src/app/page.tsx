import { Card } from "@heroui/react";
import { Suspense } from "react";
import { FoundList, FoundListSkeleton } from "@/components/reports/FoundList";
import { ButtonLink } from "@/components/ui/ButtonLink";

const STEPS = [
  { title: "1. Report", text: "Lost or found something? Post a short report with where and when." },
  {
    title: "2. Get your private link",
    text: "Lost reports get a secret link. Only you can see your matches through it.",
  },
  {
    title: "3. See scored matches",
    text: "We compare reports and show likely matches with a score and the reasons.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Lost something on campus?
        </h1>
        <p className="text-muted max-w-2xl">
          Post a report and we&apos;ll match it against items other students have found, with a
          score and an explanation for every match.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/lost/new" size="lg">
            I lost something
          </ButtonLink>
          <ButtonLink href="/found/new" variant="secondary" size="lg">
            I found something
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.title} variant="secondary">
            <Card.Header>
              <Card.Title>{s.title}</Card.Title>
              <Card.Description>{s.text}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recently found</h2>
          <ButtonLink href="/found" variant="ghost" size="sm">
            See all
          </ButtonLink>
        </div>
        <Suspense fallback={<FoundListSkeleton count={2} />}>
          <FoundList limit={4} />
        </Suspense>
      </section>
    </div>
  );
}
