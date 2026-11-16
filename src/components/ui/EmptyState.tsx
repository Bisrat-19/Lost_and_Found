import { EmptyState as HeroEmptyState } from "@heroui/react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Friendly placeholder for lists with no items yet. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <HeroEmptyState className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-default-300 px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {description ? <p className="text-muted text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </HeroEmptyState>
  );
}
