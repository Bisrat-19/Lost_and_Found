import { connection } from "next/server";
import { sseResponse } from "@/lib/events";
import { getLostByToken } from "@/lib/queries";

/** GET /api/events/:token: public events + new matches for this lost report. */
export async function GET(request: Request, ctx: RouteContext<"/api/events/[token]">) {
  await connection();
  const { token } = await ctx.params;
  const lost = await getLostByToken(token);
  if (!lost) return new Response("Not found", { status: 404 });
  return sseResponse(request, lost.id);
}
