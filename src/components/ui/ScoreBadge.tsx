import { Chip } from "@heroui/react";
import { matchStrength } from "@/lib/constants";

const STYLE = {
  strong: { color: "success", label: "Strong match" },
  possible: { color: "warning", label: "Possible match" },
  weak: { color: "default", label: "Weak match" },
} as const;

/** "82 · Strong match" chip, coloured by strength. */
export function ScoreBadge({ score }: { score: number }) {
  const { color, label } = STYLE[matchStrength(score)];
  return (
    <Chip color={color} variant="soft" size="md" aria-label={`${label}, score ${score} out of 100`}>
      <span className="font-semibold tabular-nums">{Math.round(score)}</span>
      <span aria-hidden> · </span>
      {label}
    </Chip>
  );
}
