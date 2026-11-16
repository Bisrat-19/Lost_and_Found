import type { Metadata } from "next";
import { NewLostReport } from "@/components/reports/NewLostReport";

export const metadata: Metadata = { title: "Report a lost item · Lost & Found" };

export default function NewLostPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Report a lost item</h1>
        <p className="text-muted">
          Tell us what you lost. You&apos;ll get a private link to see possible matches. No account
          needed.
        </p>
      </header>
      <NewLostReport />
    </div>
  );
}
