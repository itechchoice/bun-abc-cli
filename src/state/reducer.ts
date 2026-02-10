import type { AppAction, AppState, ChatMessage } from "./types";

export function createInitialState(sessionId: string): AppState {
  return {
    sessionId,
    messages: [],
    draft: "",
    status: "idle",
    errorText: "",
  };
}

function createMessage(id: string, role: ChatMessage["role"], content: string, ts: number): ChatMessage {
  return { id, role, content, ts };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "draft/set":
      return {
        ...state,
        draft: action.value,
      };
    case "chat/submit_start":
      return {
        ...state,
        messages: [...state.messages, createMessage(action.messageId, "user", action.prompt, action.ts)],
        draft: "",
        status: "thinking",
        errorText: "",
      };
    case "chat/submit_success":
      return {
        ...state,
        messages: [
          ...state.messages,
          createMessage(action.messageId, "assistant", action.reply, action.ts),
        ],
        draft: "",
        status: "idle",
      };
    case "chat/submit_error":
      return {
        ...state,
        draft: action.draft,
        status: "error",
        errorText: action.errorText,
      };
    case "chat/clear_error":
      return {
        ...state,
        status: state.status === "error" ? "idle" : state.status,
        errorText: "",
      };
    case "session/reset":
      return createInitialState(action.sessionId);
    default: {
      const _never: never = action;
      return state;
    }
  }
}
