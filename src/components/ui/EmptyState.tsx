import { EmptyState as HeroEmptyState } from "@heroui/react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** An empty list drawn as a blank, dashed-outline tag: an invitation to act. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <HeroEmptyState className="flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-white/40 px-6 py-10">
      <p className="text-lg font-bold text-[color:var(--ink)]">{title}</p>
      {description ? <p className="text-muted max-w-prose text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </HeroEmptyState>
  );
}
