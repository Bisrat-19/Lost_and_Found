import { after } from "next/server";
import { z } from "zod";
import { notifyResolved } from "@/lib/notify";
import { resolveLostReport } from "@/lib/resolve";

const bodySchema = z.object({
  /** The found report the owner says was theirs, or null for "got it back another way". */
  foundId: z.string().min(1).max(64).nullable().default(null),
});

/**
 * POST /api/reports/:token/resolve   { foundId?: string | null }
 * 200 → { ok: true }   404 unknown link · 409 already closed · 422 not one of your matches
 */
export async function POST(request: Request, ctx: RouteContext<"/api/reports/[token]/resolve">) {
  const { token } = await ctx.params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid foundId" }, { status: 400 });

  try {
    const result = await resolveLostReport(token, parsed.data.foundId);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    after(() => notifyResolved(result.lostId, result.foundId));
    return Response.json({ ok: true, foundId: result.foundId });
  } catch (err) {
    console.error("Failed to resolve report", err);
    return Response.json({ error: "Could not update the report. Please try again." }, { status: 500 });
  }
}
