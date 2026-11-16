import { createReport, toPublicReport } from "@/lib/reports";
import { createReportSchema, toFieldErrors } from "@/lib/schemas";

/**
 * POST /api/reports: create a lost or found report.
 *
 * 201 → { report, token? }   (token only for LOST: the private matches link)
 * 400 → { errors: { field: message } }
 * 500 → { error }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ errors: { form: "Request body must be JSON" } }, { status: 400 });
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: toFieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const report = await createReport(parsed.data);
    return Response.json(
      {
        report: toPublicReport(report),
        ...(report.token ? { token: report.token } : {}),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create report", err);
    return Response.json({ error: "Could not save the report. Please try again." }, { status: 500 });
  }
}
