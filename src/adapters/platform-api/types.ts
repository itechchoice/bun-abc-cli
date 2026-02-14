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

export type McpAuthType = "NONE" | "API_KEY" | "BASIC" | "OAUTH2" | "JWT" | "CUSTOM";

export interface McpServer {
  id: number;
  server_code: string;
  version: string;
  name: string;
  description?: string;
  endpoint: string;
  auth_type: McpAuthType;
  auth_config?: unknown;
  status: string;
  cache_version?: number;
  last_sync_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMcpRequest {
  server_code: string;
  version: string;
  name: string;
  description?: string;
  endpoint: string;
  auth_type: McpAuthType;
  auth_config: unknown;
}

export interface UpdateMcpRequest {
  name?: string;
  description?: string;
  endpoint?: string;
  auth_type?: McpAuthType;
  auth_config?: unknown;
}

export interface McpSyncResponse {
  cache_version: number;
  capabilities_count: number;
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
  input_schema?: unknown;
  output_schema?: unknown;
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
  session_id: number;
  title?: string;
  status?: string;
  message_count?: number;
  last_message_at?: string;
  created_at?: string;
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
  task_id?: number;
  task_status?: string;
  created_at?: string;
}

export interface SessionDetailResponse {
  session_id: number;
  title?: string;
  status?: string;
  created_at?: string;
  messages: SessionDetailMessage[];
}

export interface CreateTaskResponse {
  task_id: number;
  session_id: number;
  status: string;
}

export interface TaskStep {
  step_id: number;
  type?: string;
  sequence?: number;
  capability?: string;
  depends_on?: number[];
  status?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface TaskDetailResponse {
  task_id: number;
  session_id: number;
  status: string;
  current_step_id?: number | null;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  steps?: TaskStep[];
  result?: string;
  error?: string;
}

export interface TaskArtifact {
  id: number;
  name: string;
  uri: string;
  content_type?: string;
  step_id?: number;
  created_at?: string;
}

export interface TaskArtifactsResponse {
  task_id: number;
  artifacts: TaskArtifact[];
}

export interface CancelTaskResponse {
  task_id: number;
  status: string;
}

export interface SseEventRecord {
  event: string;
  data: unknown;
}
