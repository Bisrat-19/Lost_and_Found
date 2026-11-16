"use client";

import { useLiveFeed } from "@/context/LiveFeedContext";

const STATUS = {
  open: { dot: "bg-success", label: "Live" },
  connecting: { dot: "bg-warning animate-pulse", label: "Connecting…" },
  closed: { dot: "bg-default-400", label: "Offline" },
} as const;

/** Small "● Live" badge showing the SSE connection state. */
export function LiveIndicator() {
  const { connection } = useLiveFeed();
  const s = STATUS[connection];
  return (
    <span
      className="text-muted inline-flex items-center gap-1.5 text-xs"
      role="status"
      title="Live updates via Server-Sent Events"
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
