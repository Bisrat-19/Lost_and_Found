import "server-only";
import { EventEmitter } from "node:events";
import type { MatchView, PublicReport } from "./types";

/**
 * Event types sent to browsers over SSE.
 *
 * Public channel (anyone):   found reports appearing / disappearing.
 * Private channel (per lost report, via its secret link): new matches.
 */
export type PublicEvent =
  | { type: "report.created"; report: PublicReport }
  | { type: "report.resolved"; foundIds: string[] };

export type PrivateEvent =
  | { type: "match.found"; view: MatchView }
  | { type: "lost.resolved" };

export type LiveEvent = PublicEvent | PrivateEvent;

const PUBLIC = "public";
const lostChannel = (lostId: string) => `lost:${lostId}`;

/**
 * In-memory pub/sub. Works because `next dev` / `next start` is one Node
 * process. With several server instances this must become Postgres
 * LISTEN/NOTIFY or Redis pub/sub (see README).
 *
 * Stored on globalThis so dev hot-reloads don't create a second bus that the
 * already-open streams aren't listening to.
 */
const g = globalThis as unknown as { __lfBus?: EventEmitter };
const bus = (g.__lfBus ??= new EventEmitter().setMaxListeners(0));

export function publishPublic(event: PublicEvent) {
  bus.emit(PUBLIC, event);
}

export function publishToLost(lostId: string, event: PrivateEvent) {
  bus.emit(lostChannel(lostId), event);
}

/** Subscribe to the public channel, plus one lost report's private channel if given. */
export function subscribe(listener: (e: LiveEvent) => void, lostId?: string): () => void {
  bus.on(PUBLIC, listener);
  if (lostId) bus.on(lostChannel(lostId), listener);
  return () => {
    bus.off(PUBLIC, listener);
    if (lostId) bus.off(lostChannel(lostId), listener);
  };
}

const HEARTBEAT_MS = 25_000;

/**
 * Build an SSE Response. Sends each event as `event: <type>` + JSON data,
 * a comment heartbeat so proxies don't close idle connections, and cleans up
 * when the browser disconnects.
 */
export function sseResponse(request: Request, lostId?: string): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup(); // stream already closed
        }
      };

      // Tell EventSource to wait 3s before reconnecting after a drop
      send(`retry: 3000\n: connected\n\n`);

      const unsubscribe = subscribe((e) => {
        send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
      }, lostId);
      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        cleanup = () => {};
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable proxy buffering (nginx)
    },
  });
}
