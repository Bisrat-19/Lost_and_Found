import type { Metadata } from "next";
import { NewFoundReport } from "@/components/reports/NewFoundReport";

export const metadata: Metadata = { title: "Report a found item · Lost & Found" };

export default function NewFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Report a found item</h1>
        <p className="text-muted">
          Thanks for helping! Your report appears on the public found list and is matched against
          lost reports.
        </p>
      </header>
      <NewFoundReport />
    </div>
  );
}
