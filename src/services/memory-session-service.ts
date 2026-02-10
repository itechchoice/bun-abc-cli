import type { SessionService } from "./session-service";

function nextSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `session-${timestamp}-${randomPart}`;
}

export function createMemorySessionService(): SessionService {
  return {
    createSessionId() {
      return nextSessionId();
    },
    reset() {
      return nextSessionId();
    },
  };
}
