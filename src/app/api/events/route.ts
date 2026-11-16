import { connection } from "next/server";
import { sseResponse } from "@/lib/events";

/** GET /api/events: public live stream (found items added / removed). */
export async function GET(request: Request) {
  await connection(); // never prerender or cache a stream
  return sseResponse(request);
}
