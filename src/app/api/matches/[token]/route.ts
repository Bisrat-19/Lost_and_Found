import { toPublicReport } from "@/lib/reports";
import { getLostByToken, getMatchesForLost } from "@/lib/queries";

/**
 * GET /api/matches/:token[?all=1]: matches for the lost report behind a private link.
 * 404 for unknown tokens, so links can't be probed for details.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/matches/[token]">) {
  const { token } = await ctx.params;
  const lost = await getLostByToken(token);
  if (!lost) return Response.json({ error: "Not found" }, { status: 404 });

  const includeWeak = new URL(request.url).searchParams.get("all") === "1";
  const { shown, hiddenWeakCount } = await getMatchesForLost(lost, { includeWeak });

  return Response.json(
    { lost: { ...toPublicReport(lost), status: lost.status }, matches: shown, hiddenWeakCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}
