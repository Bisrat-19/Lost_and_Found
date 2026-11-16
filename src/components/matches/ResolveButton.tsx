"use client";

import { Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ResolveButtonProps = {
  token: string;
  /** The found report this button confirms, or null for "got it back another way". */
  foundId: string | null;
  label: string;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
};

/** Two-step "I got it back" button: click, then confirm. Refreshes the page when done. */
export function ResolveButton({ token, foundId, label, variant = "secondary" }: ResolveButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function resolve() {
    setPending(true);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(token)}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foundId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.danger(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success("Great news! Your report is closed.");
      router.refresh();
    } catch {
      toast.danger("Network error. Please try again.");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant={variant} size="sm" onPress={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm">
      <span className="text-sm">
        {foundId ? "Close your report and this listing?" : "Close your report?"}
      </span>
      <Button size="sm" isPending={pending} onPress={resolve}>
        Yes, I got it back
      </Button>
      <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
