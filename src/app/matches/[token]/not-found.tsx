import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MatchesNotFound() {
  return (
    <EmptyState
      title="This link doesn't match any report"
      description="Check that you copied the whole link. Without accounts, a lost link can't be recovered, but you can report the item again."
      action={<ButtonLink href="/lost/new" size="sm">Report a lost item</ButtonLink>}
    />
  );
}
