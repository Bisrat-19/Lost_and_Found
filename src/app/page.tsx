import { Suspense } from "react";
import { FoundList, FoundListSkeleton } from "@/components/reports/FoundList";
import { HeroTag, HeroTagFallback } from "@/components/reports/HeroTag";
import { ButtonLink } from "@/components/ui/ButtonLink";

const STEPS = [
  {
    title: "Post a report",
    text: "Say what it is, its colour, and where and when you lost or found it.",
  },
  {
    title: "Keep your private link",
    text: "Lost reports get a link only you know. No account needed.",
  },
  {
    title: "Check your matches",
    text: "Each likely match has a score and the reasons behind it, and new ones appear live.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="grid items-center gap-10 md:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-[2.6rem] sm:text-6xl">Lost something on campus?</h1>
          <p className="text-muted max-w-xl text-lg leading-relaxed">
            Post what you lost and we&apos;ll compare it with every item students have handed in,
            then show you the likely matches and why they match.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/lost/new" size="lg">
              I lost something
            </ButtonLink>
            <ButtonLink href="/found/new" variant="secondary" size="lg">
              I found something
            </ButtonLink>
          </div>
        </div>
        <Suspense fallback={<HeroTagFallback />}>
          <HeroTag />
        </Suspense>
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-6">
        <h2 id="how" className="font-display text-2xl">
          How it works
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 border-t-2 border-[color:var(--ink)] pt-4">
              <span className="font-display text-3xl text-[color:var(--twine)]" aria-hidden>
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <h2 id="recent" className="font-display text-2xl">
            Recently handed in
          </h2>
          <ButtonLink href="/found" variant="ghost" size="sm">
            See all found items
          </ButtonLink>
        </div>
        <Suspense fallback={<FoundListSkeleton count={4} />}>
          <FoundList limit={4} />
        </Suspense>
      </section>
    </div>
  );
}
