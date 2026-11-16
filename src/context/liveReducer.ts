// Pure reducer for the live store: no React, no browser APIs, so it is unit-testable.
import type { MatchView, PublicReport } from "@/lib/types";

// ---------------------------------------------------------------------------
// State + actions
// ---------------------------------------------------------------------------
export type ConnectionStatus = "connecting" | "open" | "closed";

export type LiveState = {
  connection: ConnectionStatus;
  /** Found reports created since the page loaded, newest first. */
  newFound: PublicReport[];
  /** Found reports closed since the page loaded (hide them). */
  resolvedFoundIds: string[];
  /** New matches for this page's lost report (private stream only). */
  newMatches: MatchView[];
};

export type LiveAction =
  | { type: "connection/changed"; status: ConnectionStatus }
  | { type: "found/added"; report: PublicReport }
  | { type: "found/resolved"; ids: string[] }
  | { type: "match/added"; view: MatchView };

export const initialLiveState: LiveState = {
  connection: "connecting",
  newFound: [],
  resolvedFoundIds: [],
  newMatches: [],
};

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "connection/changed":
      return state.connection === action.status ? state : { ...state, connection: action.status };
    case "found/added":
      if (state.newFound.some((r) => r.id === action.report.id)) return state;
      return { ...state, newFound: [action.report, ...state.newFound] };
    case "found/resolved":
      return { ...state, resolvedFoundIds: [...new Set([...state.resolvedFoundIds, ...action.ids])] };
    case "match/added":
      return {
        ...state,
        // Replace if we already had this found item (score may have changed)
        newMatches: [action.view, ...state.newMatches.filter((v) => v.found.id !== action.view.found.id)],
      };
  }
}
