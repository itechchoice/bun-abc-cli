export const DEFAULT_BASE_URL = "https://arch.stg.alphabitcore.io/api/v1";

export const MAX_LOG_ENTRIES = 400;

export const TERMINAL_TASK_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
export const TERMINAL_TASK_EVENTS = new Set(["task.completed", "task.failed", "task.cancelled"]);
export const AUTH_TYPES = new Set(["NONE", "API_KEY", "BASIC", "OAUTH2", "JWT", "CUSTOM"]);
export const RETRIABLE_HTTP_STATUSES = new Set([408, 425, 429]);
