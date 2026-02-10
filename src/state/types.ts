export type AppStatus = "idle" | "thinking" | "error";

export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  ts: number;
}

export interface AppState {
  sessionId: string;
  messages: ChatMessage[];
  draft: string;
  status: AppStatus;
  errorText: string;
}

export type AppAction =
  | { type: "draft/set"; value: string }
  | { type: "chat/submit_start"; prompt: string; messageId: string; ts: number }
  | { type: "chat/submit_success"; reply: string; messageId: string; ts: number }
  | { type: "chat/submit_error"; errorText: string; draft: string }
  | { type: "chat/clear_error" }
  | { type: "session/reset"; sessionId: string };
