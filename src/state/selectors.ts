import type { AppState } from "./types";

export function selectCanSubmit(state: AppState): boolean {
  return (state.surfacePhase === "editing" || state.surfacePhase === "terminal") && state.draft.trim() !== "";
}

export function selectErrorSummary(state: AppState): string {
  return state.errorText.slice(0, 120);
}
