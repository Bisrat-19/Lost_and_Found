import { Card, Chip } from "@heroui/react";
import type { ReactNode } from "react";
import { CATEGORY_LABELS, locationLabel } from "@/lib/constants";
import type { PublicReport } from "@/lib/types";

type ReportCardProps = {
  report: PublicReport;
  /** Top-right slot, e.g. a ScoreBadge. */
  badge?: ReactNode;
  /** Footer slot, e.g. match reasons or actions. */
  footer?: ReactNode;
};

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

/** Public view of a report. Shows no contact details. */
export function ReportCard({ report, badge, footer }: ReportCardProps) {
  const verb = report.type === "LOST" ? "Lost" : "Found";

  return (
    <Card>
      <Card.Header className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Card.Title>{CATEGORY_LABELS[report.category]}</Card.Title>
          <Card.Description>
            {verb} at {locationLabel(report.location)} · {dateFmt.format(new Date(report.date))}
          </Card.Description>
        </div>
        {badge}
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">{report.description}</p>
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="secondary">
            {report.color ?? "colour unknown"}
          </Chip>
          <Chip size="sm" variant="secondary" color={report.type === "LOST" ? "danger" : "accent"}>
            {verb}
          </Chip>
        </div>
      </Card.Content>
      {footer ? <Card.Footer>{footer}</Card.Footer> : null}
    </Card>
  );
}
