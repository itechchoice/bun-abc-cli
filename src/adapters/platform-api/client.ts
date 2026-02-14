import type {
  ApiRequestOptions,
  ApiResponse,
  CancelTaskResponse,
  CreateMcpRequest,
  CreateTaskResponse,
  HttpMethod,
  LoginRequest,
  LoginResponse,
  McpAuthStatusResponse,
  McpCapability,
  McpServer,
  McpSyncResponse,
  SessionDetailResponse,
  SessionListResponse,
  StartMcpAuthRequest,
  StartMcpAuthResponse,
  TaskArtifactsResponse,
  TaskDetailResponse,
  UpdateMcpRequest,
} from "./types";

const DEFAULT_BASE_URL = "https://dychoice.stg.alphabitcore.io/api/v1";

function joinUrl(baseUrl: string, path: string, query?: ApiRequestOptions["query"]): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const fullPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${fullPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function parseBodyByContentType(contentType: string, raw: string): unknown {
  if (raw.trim() === "") {
    return null;
  }
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        raw_text: raw,
        content_type: contentType,
      };
    }
  }
  return {
    raw_text: raw,
    content_type: contentType,
  };
}

export class PlatformApiClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl && baseUrl.trim() !== "") ? baseUrl : (process.env.ABC_API_BASE_URL?.trim() || DEFAULT_BASE_URL);
  }

  async request(method: HttpMethod, path: string, options: ApiRequestOptions = {}): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(joinUrl(this.baseUrl, path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    const body = parseBodyByContentType(contentType, raw);

    return {
      method,
      path,
      status: response.status,
      ok: response.ok,
      contentType,
      body,
    };
  }

  login(payload: LoginRequest): Promise<ApiResponse> {
    return this.request("POST", "/auth/login", { body: payload });
  }

  listMcp(token: string, params: { serverCode?: string; status?: string } = {}): Promise<ApiResponse> {
    return this.request("GET", "/mcp/servers", {
      token,
      query: {
        server_code: params.serverCode,
        status: params.status,
      },
    });
  }

  createMcp(token: string, payload: CreateMcpRequest): Promise<ApiResponse> {
    return this.request("POST", "/mcp/servers", { token, body: payload });
  }

  getMcp(token: string, id: number): Promise<ApiResponse> {
    return this.request("GET", `/mcp/servers/${id}`, { token });
  }

  updateMcp(token: string, id: number, payload: UpdateMcpRequest): Promise<ApiResponse> {
    return this.request("PUT", `/mcp/servers/${id}`, { token, body: payload });
  }

  deleteMcp(token: string, id: number): Promise<ApiResponse> {
    return this.request("DELETE", `/mcp/servers/${id}`, { token });
  }

  syncMcp(token: string, id: number): Promise<ApiResponse> {
    return this.request("POST", `/mcp/servers/${id}/sync`, { token });
  }

  listCapabilities(token: string, id: number): Promise<ApiResponse> {
    return this.request("GET", `/mcp/servers/${id}/capabilities`, { token });
  }

  startMcpAuth(token: string, id: number, payload: StartMcpAuthRequest): Promise<ApiResponse> {
    return this.request("POST", `/mcp/servers/${id}/auth`, { token, body: payload });
  }

  getMcpAuthStatus(token: string, id: number): Promise<ApiResponse> {
    return this.request("GET", `/mcp/servers/${id}/auth`, { token });
  }

  deleteMcpAuth(token: string, id: number, connectionId?: number): Promise<ApiResponse> {
    return this.request("DELETE", `/mcp/servers/${id}/auth`, {
      token,
      query: {
        connectionId,
      },
    });
  }

  createSession(token: string, title?: string): Promise<ApiResponse> {
    return this.request("POST", "/sessions", {
      token,
      body: title ? { title } : {},
    });
  }

  listSessions(token: string, params: { status?: string; page?: number; size?: number } = {}): Promise<ApiResponse> {
    return this.request("GET", "/sessions", {
      token,
      query: {
        status: params.status,
        page: params.page,
        size: params.size,
      },
    });
  }

  getSession(token: string, sessionId: number): Promise<ApiResponse> {
    return this.request("GET", `/sessions/${sessionId}`, { token });
  }

  createTask(token: string, payload: { message: string; session_id?: number }): Promise<ApiResponse> {
    return this.request("POST", "/tasks", {
      token,
      body: payload,
    });
  }

  getTask(token: string, taskId: number): Promise<ApiResponse> {
    return this.request("GET", `/tasks/${taskId}`, { token });
  }

  getTaskArtifacts(token: string, taskId: number): Promise<ApiResponse> {
    return this.request("GET", `/tasks/${taskId}/artifacts`, { token });
  }

  cancelTask(token: string, taskId: number): Promise<ApiResponse> {
    return this.request("POST", `/tasks/${taskId}/cancel`, { token });
  }
}

export type {
  CancelTaskResponse,
  CreateMcpRequest,
  CreateTaskResponse,
  LoginRequest,
  LoginResponse,
  McpAuthStatusResponse,
  McpCapability,
  McpServer,
  McpSyncResponse,
  SessionDetailResponse,
  SessionListResponse,
  StartMcpAuthRequest,
  StartMcpAuthResponse,
  TaskArtifactsResponse,
  TaskDetailResponse,
  UpdateMcpRequest,
};
