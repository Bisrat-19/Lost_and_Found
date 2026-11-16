import { Chip } from "@heroui/react";
import type { ReactNode } from "react";
import { CATEGORY_LABELS, locationLabel } from "@/lib/constants";
import type { PublicReport } from "@/lib/types";

type ReportCardProps = {
  report: PublicReport;
  /** Top-right slot, e.g. a ScoreBadge. */
  badge?: ReactNode;
  /** Bottom slot, e.g. match reasons or actions. Shown below a perforation. */
  footer?: ReactNode;
  className?: string;
};

const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

/**
 * A report drawn as a paper claim tag: the stub holds the date, the body holds
 * what and where. Manila for found items, raspberry for lost ones.
 * Public view: never shows contact details.
 */
export function ReportCard({ report, badge, footer, className = "" }: ReportCardProps) {
  const found = report.type === "FOUND";
  const date = new Date(report.date);

  return (
    <article
      className={`claim-tag ${className}`}
      data-kind={found ? "found" : "lost"}
      aria-label={`${found ? "Found" : "Lost"}: ${CATEGORY_LABELS[report.category]}, ${full.format(date)}`}
    >
      <div className="claim-tag-stub" aria-hidden>
        <span className="claim-tag-stub-day">{day.format(date)}</span>
        <span className="claim-tag-stub-month">{month.format(date)}</span>
        <span className="claim-tag-stub-kind">{found ? "Found" : "Lost"}</span>
      </div>

      <div className="claim-tag-body">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-base font-bold leading-snug">{CATEGORY_LABELS[report.category]}</h3>
            <p className="text-sm text-[color:var(--tag-ink)]">
              {found ? "Found at " : "Last seen at "}
              <span className="font-semibold">{locationLabel(report.location)}</span>
            </p>
          </div>
          {badge}
        </div>

        <p className="text-[0.95rem] leading-relaxed">{report.description}</p>

        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="secondary" className="bg-white/60">
            {report.color ? report.color : "Colour not given"}
          </Chip>
        </div>

        {footer ? (
          <>
            <hr className="claim-tag-divider" />
            {footer}
          </>
        ) : null}
      </div>
    </article>
  );
}
