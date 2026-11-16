"use client";

// Global live state, Redux-style: one store, typed actions, a pure reducer.
// Fed by Server-Sent Events. React Context + useReducer, no extra library.

import { toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import type { MatchView } from "@/lib/types";
import { initialLiveState, liveReducer, type LiveAction, type LiveState } from "./liveReducer";

export type { ConnectionStatus, LiveAction, LiveState } from "./liveReducer";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const StateContext = createContext<LiveState>(initialLiveState);
const DispatchContext = createContext<Dispatch<LiveAction>>(() => {});

export const useLiveFeed = () => use(StateContext);
export const useLiveDispatch = () => use(DispatchContext);

/**
 * Opens an SSE stream and keeps the store in sync.
 * - No token: public stream (found items added/removed). Used app-wide in the layout.
 * - With token: public events + new matches for that lost report. Used on the matches page.
 */
export function LiveFeedProvider({ token, children }: { token?: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(liveReducer, initialLiveState);
  const router = useRouter();

  useEffect(() => {
    const url = token ? `/api/events/${encodeURIComponent(token)}` : "/api/events";
    const source = new EventSource(url);
    const parse = (e: MessageEvent) => JSON.parse(e.data);

    source.onopen = () => dispatch({ type: "connection/changed", status: "open" });
    // EventSource reconnects by itself; CLOSED means it gave up (e.g. 404)
    source.onerror = () =>
      dispatch({
        type: "connection/changed",
        status: source.readyState === EventSource.CLOSED ? "closed" : "connecting",
      });

    source.addEventListener("report.created", (e) => {
      dispatch({ type: "found/added", report: parse(e as MessageEvent).report });
    });
    source.addEventListener("report.resolved", (e) => {
      dispatch({ type: "found/resolved", ids: parse(e as MessageEvent).foundIds });
    });
    source.addEventListener("match.found", (e) => {
      const view: MatchView = parse(e as MessageEvent).view;
      dispatch({ type: "match/added", view });
      toast.success(`New ${view.match.strength} match: ${view.match.score}`, {
        description: view.found.description.slice(0, 80),
      });
    });
    // Closed from another tab: reload the server-rendered page to show the closed state
    source.addEventListener("lost.resolved", () => router.refresh());

    return () => source.close();
  }, [token, router]);

  return (
    <StateContext value={state}>
      <DispatchContext value={dispatch}>{children}</DispatchContext>
    </StateContext>
  );
}
