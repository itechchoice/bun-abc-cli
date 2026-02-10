import type { AppState, ChatMessage } from "./types";

export function selectSessionId(state: AppState): string {
  return state.sessionId;
}

export function selectMessages(state: AppState): ChatMessage[] {
  return state.messages;
}

export function selectDraft(state: AppState): string {
  return state.draft;
}

export function selectStatus(state: AppState): AppState["status"] {
  return state.status;
}

export function selectErrorText(state: AppState): string {
  return state.errorText;
}

export function selectCanSubmit(state: AppState): boolean {
  return state.status !== "thinking" && state.draft.trim() !== "";
}

export function selectErrorSummary(state: AppState): string {
  return state.errorText.slice(0, 120);
}
