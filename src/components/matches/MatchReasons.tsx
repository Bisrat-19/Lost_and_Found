import type { Reason } from "@/lib/matching/score";

const TONE = {
  positive: { icon: "✓", className: "text-success", label: "Supports the match" },
  negative: { icon: "✗", className: "text-danger", label: "Argues against the match" },
  neutral: { icon: "•", className: "text-muted", label: "No strong signal" },
} as const;

/** "Why this matched": one line per signal, with its points. */
export function MatchReasons({ reasons }: { reasons: Reason[] }) {
  return (
    <ul className="flex w-full flex-col gap-1.5 text-sm" aria-label="Why this matched">
      {reasons.map((r) => {
        const tone = TONE[r.tone];
        return (
          <li key={r.signal} className="flex items-start gap-2">
            <span className={`w-4 shrink-0 text-center font-bold ${tone.className}`} aria-label={tone.label}>
              {tone.icon}
            </span>
            <span className="flex-1">{r.text}</span>
            <span className="text-muted shrink-0 tabular-nums">
              {Math.round(r.points)}/{r.max}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
