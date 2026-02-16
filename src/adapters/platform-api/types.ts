export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiRequestOptions {
  token?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  method: HttpMethod;
  path: string;
  status: number;
  ok: boolean;
  contentType: string;
  body: unknown;
}

export interface PlatformApiError {
  method: HttpMethod;
  path: string;
  status: number;
  body: unknown;
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export type McpAuthType = "NONE" | "API_KEY" | "BASIC" | "OAUTH2" | "JWT" | "CUSTOM";

export interface McpServer {
  id: number;
  serverCode: string;
  version: string;
  name: string;
  description?: string;
  endpoint: string;
  authType: McpAuthType;
  authConfig?: unknown;
  status: string;
  connectionStatus?: string | null;
  cacheVersion?: number;
  lastSyncAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMcpRequest {
  serverCode: string;
  version: string;
  name: string;
  description?: string;
  endpoint: string;
  authType: McpAuthType;
  authConfig: unknown;
}

export interface UpdateMcpRequest {
  name?: string;
  description?: string;
  endpoint?: string;
  authType?: McpAuthType;
  authConfig?: unknown;
}

export interface McpSyncResponse {
  cacheVersion: number;
  capabilitiesCount: number;
  diff: {
    added: string[];
    removed: string[];
    updated: string[];
  };
}

export interface McpCapability {
  id: number;
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  status?: string;
}

export interface StartMcpAuthRequest {
  connectionName?: string;
  returnUrl?: string;
  credentials?: unknown;
}

export interface StartMcpAuthResponse {
  success: boolean;
  connectionId?: number;
  message?: string;
}

export interface McpAuthStatusResponse {
  authenticated: boolean;
  connectionId?: number;
  connectionName?: string;
  authType?: string;
  credentials?: unknown;
  expiresAt?: string;
}

export interface SessionItem {
  sessionId: number;
  title?: string;
  status?: string;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
}

export interface SessionListResponse {
  items: SessionItem[];
  total: number;
  page: number;
  size: number;
}

export interface SessionDetailMessage {
  id: number;
  role: string;
  content: string | null;
  taskId?: number;
  taskStatus?: string;
  createdAt?: string;
}

export interface SessionDetailResponse {
  sessionId: number;
  title?: string;
  status?: string;
  createdAt?: string;
  messages: SessionDetailMessage[];
}

export interface CreateTaskResponse {
  taskId: number;
  sessionId: number;
  status: string;
}

export interface TaskStep {
  stepId: number;
  type?: string;
  sequence?: number;
  capability?: string;
  dependsOn?: number[];
  status?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface TaskDetailResponse {
  taskId: number;
  sessionId: number;
  status: string;
  currentStepSequence?: number | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  steps?: TaskStep[];
  result?: string;
  error?: string;
}

export interface TaskListItem {
  taskId: number;
  sessionId: number;
  message?: string;
  status: string;
  currentStepSequence?: number | null;
  result?: string | null;
  error?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface TaskListResponse {
  items: TaskListItem[];
  total: number;
  page: number;
  size: number;
}

export interface CancelTaskResponse {
  taskId: number;
  status: string;
}

export interface SseEventRecord {
  event: string;
  data: unknown;
}
