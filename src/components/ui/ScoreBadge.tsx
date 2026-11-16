import { matchStrength } from "@/lib/constants";

const STYLE = {
  strong: { className: "bg-teal text-white", label: "Strong match" },
  possible: { className: "bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)]", label: "Possible match" },
  weak: { className: "bg-white/70 text-[var(--muted)]", label: "Weak match" },
} as const;

/** Score out of 100 with its strength, like a rubber stamp on the tag. */
export function ScoreBadge({ score }: { score: number }) {
  const { className, label } = STYLE[matchStrength(score)];
  return (
    <span
      className={`inline-flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 leading-none ${className}`}
      role="img"
      aria-label={`${label}, score ${Math.round(score)} out of 100`}
    >
      <span className="font-display text-xl tabular-nums" aria-hidden>
        {Math.round(score)}
      </span>
      <span className="mt-1 text-[0.68rem] font-semibold" aria-hidden>
        {label}
      </span>
    </span>
  );
}
