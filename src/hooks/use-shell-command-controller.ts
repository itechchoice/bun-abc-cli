import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformApiClient } from "../adapters/platform-api/client";
import { SseHttpError, subscribeTaskEvents } from "../adapters/platform-api/sse";
import type { ApiResponse, McpAuthType } from "../adapters/platform-api/types";
import { clearAuthToken, loadAuthSession, saveAuthSession } from "../cli/shell/auth-token-store";
import { parseShellInput, readStringOption } from "../cli/shell/parser";
import type { AuthSessionState, LoginStep, ParsedCommandInput, ParsedShellInput, ShellLogEntry, ShellLogLevel } from "../cli/shell/types";
import { THEME_NAMES, isThemeName } from "../theme/themes";
import type { ThemeName } from "../theme/types";

interface UseShellCommandControllerOptions {
  apiClient: PlatformApiClient;
  themeName: ThemeName;
  themeWarning?: string | null;
  setThemeName: (name: ThemeName) => Promise<void> | void;
  onExit?: () => void;
}

type StreamState = "ok" | "retry";

const MAX_LOG_ENTRIES = 400;
const TERMINAL_TASK_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const TERMINAL_TASK_EVENTS = new Set(["task.completed", "task.failed", "task.cancelled"]);
const AUTH_TYPES = new Set(["NONE", "API_KEY", "BASIC", "OAUTH2", "JWT", "CUSTOM"]);
const RETRIABLE_HTTP_STATUSES = new Set([408, 425, 429]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object";
}

function readStringField(input: unknown, key: string): string | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "string" ? value : null;
}

function readNumberField(input: unknown, key: string): number | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBooleanField(input: unknown, key: string): boolean | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "boolean" ? value : null;
}

function readNumberFieldByKeys(input: unknown, keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumberField(input, key);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function readTaskStatus(input: unknown): string | null {
  return readStringField(input, "status");
}

function readTaskSessionId(input: unknown): number | null {
  return readNumberFieldByKeys(input, ["sessionId", "session_id"]);
}

function isTerminalTaskStatus(status: string | null): boolean {
  return status !== null && TERMINAL_TASK_STATUSES.has(status.toUpperCase());
}

function parseJsonOption(value: string | undefined, optionName: string): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${optionName} must be valid JSON.`);
  }
}

function parsePositiveInt(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function resolveNumericId(
  label: string,
  positionals: string[],
  options: Record<string, string | boolean | string[]>,
  optionName = "id",
): number {
  if (positionals.length > 1) {
    throw new Error(`${label} accepts at most one positional id.`);
  }

  const positionalRaw = positionals[0]?.trim() || null;
  const optionRaw = readStringOption(options, optionName)?.trim() || null;

  if (positionalRaw && optionRaw && positionalRaw !== optionRaw) {
    throw new Error(`Conflicting ${label} values between positional and --${optionName}.`);
  }

  const raw = optionRaw ?? positionalRaw;
  if (!raw) {
    throw new Error(`${label} is required.`);
  }

  return parsePositiveInt(raw, label);
}

function resolveTaskId(
  commandName: string,
  positionals: string[],
  options: Record<string, string | boolean | string[]>,
  impliedTaskId: string | null = null,
): number {
  if (positionals.length > 1) {
    throw new Error(`run ${commandName} accepts at most one positional task id.`);
  }

  const positionalRaw = positionals[0]?.trim() || null;
  const optionRaw = readStringOption(options, "task-id")?.trim() || null;

  const values = [positionalRaw, optionRaw, impliedTaskId].filter((value): value is string => Boolean(value));
  const unique = new Set(values);
  if (unique.size > 1) {
    throw new Error(`Conflicting task id values for run ${commandName}.`);
  }

  const raw = values[0];
  if (!raw) {
    throw new Error(`run ${commandName} requires <task_id> or --task-id <id>.`);
  }

  return parsePositiveInt(raw, "task_id");
}

function parseFollowOption(options: Record<string, string | boolean | string[]>): { follow: boolean; impliedTaskId: string | null } {
  const followRaw = options.follow;
  if (followRaw === undefined) {
    return { follow: false, impliedTaskId: null };
  }

  const values = Array.isArray(followRaw) ? followRaw : [followRaw];
  let follow = false;
  let impliedTaskId: string | null = null;

  for (const value of values) {
    if (value === true) {
      follow = true;
      continue;
    }

    if (typeof value === "string") {
      follow = true;
      const taskId = value.trim();
      if (impliedTaskId && impliedTaskId !== taskId) {
        throw new Error("Conflicting task id values in --follow.");
      }
      impliedTaskId = taskId;
      continue;
    }

    throw new Error("Invalid --follow option value.");
  }

  return { follow, impliedTaskId };
}

function isRetriableHttpStatus(status: number): boolean {
  return status >= 500 || RETRIABLE_HTTP_STATUSES.has(status);
}

function readJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function useShellCommandController(options: UseShellCommandControllerOptions) {
  const [logs, setLogs] = useState<ShellLogEntry[]>([]);
  const [authState, setAuthState] = useState<AuthSessionState>({
    accessToken: null,
    refreshToken: null,
    username: null,
    loginAt: null,
  });
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const [streamState, setStreamState] = useState<StreamState>("ok");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [activeCommandLabel, setActiveCommandLabel] = useState<string | null>(null);
  const [isFollowingEvents, setIsFollowingEvents] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const loginDraftRef = useRef<{ username: string | null }>({ username: null });
  const inFlightRef = useRef(false);
  const runningCommandRef = useRef<string | null>(null);
  const followAbortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const themeWarningLoggedRef = useRef(false);

  const appendLog = useCallback((level: ShellLogLevel, text: string) => {
    setLogs((prev) => {
      const next: ShellLogEntry = {
        id: nextId("log"),
        ts: Date.now(),
        level,
        text,
      };
      const merged = [...prev, next];
      if (merged.length <= MAX_LOG_ENTRIES) {
        return merged;
      }
      return merged.slice(merged.length - MAX_LOG_ENTRIES);
    });
  }, []);

  const appendClientLog = useCallback((level: ShellLogLevel, text: string) => {
    appendLog(level, text);
  }, [appendLog]);

  const appendJsonBlock = useCallback((level: ShellLogLevel, value: unknown) => {
    const pretty = JSON.stringify(value ?? null, null, 2);
    appendLog(level, pretty);
  }, [appendLog]);

  const beginRequest = useCallback(() => {
    setPendingRequestCount((prev) => prev + 1);
  }, []);

  const endRequest = useCallback(() => {
    setPendingRequestCount((prev) => (prev <= 0 ? 0 : prev - 1));
  }, []);

  const trackRequest = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    beginRequest();
    try {
      return await fn();
    } finally {
      endRequest();
    }
  }, [beginRequest, endRequest]);

  const printApiResponse = useCallback((response: ApiResponse) => {
    appendLog("info", `> ${response.method} ${response.path}`);
    appendLog(response.ok ? "success" : "error", `< STATUS ${response.status}`);
    appendJsonBlock(response.ok ? "info" : "error", response.body);
  }, [appendJsonBlock, appendLog]);

  const clearAuthState = useCallback(async () => {
    setAuthState({ accessToken: null, refreshToken: null, username: null, loginAt: null });
    await clearAuthToken();
  }, []);

  const saveAndSetAuthState = useCallback(
    async (next: { accessToken: string; refreshToken?: string | null; username?: string | null }) => {
      const normalizedRefreshToken = next.refreshToken?.trim() ? next.refreshToken : undefined;
      await saveAuthSession({
        accessToken: next.accessToken,
        ...(normalizedRefreshToken ? { refreshToken: normalizedRefreshToken } : {}),
      });
      setAuthState((prev) => ({
        accessToken: next.accessToken,
        refreshToken: normalizedRefreshToken ?? null,
        username: next.username ?? prev.username ?? null,
        loginAt: Date.now(),
      }));
    },
    [],
  );

  const ensureLoggedIn = useCallback((): string => {
    if (!authState.accessToken) {
      throw new Error("Not logged in. Run /login first.");
    }
    return authState.accessToken;
  }, [authState.accessToken]);

  const refreshAccessToken = useCallback(
    async (reasonLabel = "Access token expired. Trying auth refresh...", clearWhenMissing = true): Promise<string | null> => {
      const refreshToken = authState.refreshToken;
      if (!refreshToken) {
        if (clearWhenMissing) {
          await clearAuthState();
        }
        appendLog("error", "No refresh_token found. Please run /login.");
        return null;
      }

      appendLog("info", reasonLabel);
      const refreshResponse = await trackRequest(() => options.apiClient.refreshToken(refreshToken));
      printApiResponse(refreshResponse);

      if (!refreshResponse.ok) {
        await clearAuthState();
        appendLog("error", "Token refresh failed. Please run /login.");
        return null;
      }

      const nextAccessToken = readStringField(refreshResponse.body, "access_token");
      const nextRefreshToken = readStringField(refreshResponse.body, "refresh_token");

      if (!nextAccessToken) {
        await clearAuthState();
        appendLog("error", "Refresh response missing access_token. Please run /login.");
        return null;
      }

      await saveAndSetAuthState({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken ?? refreshToken,
      });
      appendLog("success", "Token refreshed.");
      return nextAccessToken;
    },
    [authState.refreshToken, appendLog, clearAuthState, options.apiClient, printApiResponse, saveAndSetAuthState, trackRequest],
  );

  const runWithAutoRefresh = useCallback(
    async (execute: (accessToken: string) => Promise<ApiResponse>): Promise<ApiResponse> => {
      const accessToken = ensureLoggedIn();
      let response = await trackRequest(() => execute(accessToken));
      printApiResponse(response);

      if (response.status !== 401) {
        return response;
      }

      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        return response;
      }

      appendLog("info", "Retrying previous request with refreshed token...");
      response = await trackRequest(() => execute(nextAccessToken));
      printApiResponse(response);

      if (response.status === 401) {
        await clearAuthState();
        appendLog("error", "Authorization expired or invalid after retry. Please run /login.");
      }

      return response;
    },
    [appendLog, clearAuthState, ensureLoggedIn, printApiResponse, refreshAccessToken, trackRequest],
  );

  useEffect(() => {
    stoppedRef.current = false;

    void (async () => {
      try {
        const session = await loadAuthSession();
        if (!session) {
          return;
        }

        const expiryMs = readJwtExpiryMs(session.accessToken);
        if (expiryMs !== null && Date.now() >= expiryMs) {
          await clearAuthToken();
          setAuthState({ accessToken: null, refreshToken: null, username: null, loginAt: null });
          appendLog("error", "Stored token is expired. Please run /login.");
          return;
        }

        setAuthState({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? null,
          username: null,
          loginAt: Date.now(),
        });
        appendLog("success", "Restored auth session from local store.");
      } catch (error) {
        appendLog("error", `Failed to restore token: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      stoppedRef.current = true;
      followAbortRef.current?.abort();
      followAbortRef.current = null;
    };
  }, [appendLog]);

  useEffect(() => {
    if (!options.themeWarning || themeWarningLoggedRef.current) {
      return;
    }
    appendLog("error", options.themeWarning);
    themeWarningLoggedRef.current = true;
  }, [appendLog, options.themeWarning]);

  const loginHint = useMemo(() => {
    if (isFollowingEvents) {
      return "observer mode> following events (Ctrl+C to stop)";
    }
    if (loginStep === "await_username") {
      return "login> enter username";
    }
    if (loginStep === "await_password") {
      return "login> enter password (masked)";
    }
    return null;
  }, [isFollowingEvents, loginStep]);

  const consumeLoginStep = useCallback(async (rawInput: string) => {
    const value = rawInput.trim();

    if (loginStep === "await_username") {
      if (!value) {
        appendLog("error", "Username cannot be empty.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Username cannot start with '/'.");
        return;
      }

      loginDraftRef.current = { username: value };
      setLoginStep("await_password");
      appendLog("info", "Enter password (masked).");
      return;
    }

    if (loginStep === "await_password") {
      if (!value) {
        appendLog("error", "Password cannot be empty.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Password cannot start with '/'.");
        return;
      }

      const username = loginDraftRef.current.username;
      if (!username) {
        setLoginStep("idle");
        appendLog("error", "Login state mismatch. Run /login again.");
        return;
      }

      const response = await trackRequest(() => options.apiClient.login({ username, password: value }));
      printApiResponse(response);

      if (!response.ok) {
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      const accessToken = readStringField(response.body, "access_token");
      const refreshToken = readStringField(response.body, "refresh_token");
      if (!accessToken) {
        appendLog("error", "Login response missing access_token.");
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      await saveAndSetAuthState({ accessToken, refreshToken, username });
      setLoginStep("idle");
      loginDraftRef.current = { username: null };
      appendLog("success", `Login succeeded for '${username}'.`);
    }
  }, [appendLog, loginStep, options.apiClient, printApiResponse, saveAndSetAuthState, trackRequest]);

  const executeMcpCommand = useCallback(async (parsed: ParsedCommandInput) => {
    if (parsed.command === "add") {
      const payloadJsonRaw = readStringOption(parsed.options, "payload-json");
      if (payloadJsonRaw !== undefined) {
        const hasConflict =
          readStringOption(parsed.options, "server-code") !== undefined
          || readStringOption(parsed.options, "url") !== undefined
          || readStringOption(parsed.options, "version") !== undefined
          || readStringOption(parsed.options, "name") !== undefined
          || readStringOption(parsed.options, "description") !== undefined
          || readStringOption(parsed.options, "auth-type") !== undefined
          || readStringOption(parsed.options, "auth-config-json") !== undefined;
        if (hasConflict) {
          throw new Error("mcp add --payload-json cannot be used with other add options.");
        }
        const payload = parseJsonOption(payloadJsonRaw, "--payload-json");
        if (!isRecord(payload)) {
          throw new Error("--payload-json must be a JSON object.");
        }
        const requiredFields = ["serverCode", "version", "name", "endpoint", "authType", "authConfig"];
        for (const field of requiredFields) {
          if (!(field in payload)) {
            throw new Error(`mcp add --payload-json missing required field '${field}'.`);
          }
        }
        await runWithAutoRefresh((accessToken) => options.apiClient.createMcp(accessToken, payload as Record<string, unknown> as {
          serverCode: string;
          version: string;
          name: string;
          endpoint: string;
          authType: McpAuthType;
          authConfig: unknown;
          description?: string;
        }));
        return;
      }

      const serverCode = readStringOption(parsed.options, "server-code");
      const endpoint = readStringOption(parsed.options, "url");
      const version = readStringOption(parsed.options, "version");
      if (!serverCode || !endpoint || !version) {
        throw new Error("mcp add requires --server-code <code> --url <endpoint> --version <v>.");
      }

      const authTypeRaw = (readStringOption(parsed.options, "auth-type") ?? "NONE").toUpperCase();
      if (!AUTH_TYPES.has(authTypeRaw)) {
        throw new Error("mcp add --auth-type must be one of NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM.");
      }

      await runWithAutoRefresh((accessToken) => options.apiClient.createMcp(accessToken, {
        serverCode,
        version,
        name: readStringOption(parsed.options, "name") ?? serverCode,
        description: readStringOption(parsed.options, "description"),
        endpoint,
        authType: authTypeRaw as McpAuthType,
        authConfig: parseJsonOption(readStringOption(parsed.options, "auth-config-json"), "--auth-config-json") ?? {},
      }));
      return;
    }

    if (parsed.command === "list") {
      await runWithAutoRefresh((accessToken) => options.apiClient.listMcp(accessToken, {
        serverCode: readStringOption(parsed.options, "server-code"),
        status: readStringOption(parsed.options, "status"),
      }));
      return;
    }

    if (parsed.command === "get") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      await runWithAutoRefresh((accessToken) => options.apiClient.getMcp(accessToken, id));
      return;
    }

    if (parsed.command === "update") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      const payload: Record<string, unknown> = {};

      const name = readStringOption(parsed.options, "name");
      const description = readStringOption(parsed.options, "description");
      const endpoint = readStringOption(parsed.options, "url");
      const authType = readStringOption(parsed.options, "auth-type");
      const authConfigJson = readStringOption(parsed.options, "auth-config-json");

      if (name !== undefined) {
        payload.name = name;
      }
      if (description !== undefined) {
        payload.description = description;
      }
      if (endpoint !== undefined) {
        payload.endpoint = endpoint;
      }
      if (authType !== undefined) {
        const normalized = authType.toUpperCase();
        if (!AUTH_TYPES.has(normalized)) {
          throw new Error("mcp update --auth-type must be one of NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM.");
        }
        payload.authType = normalized;
      }
      if (authConfigJson !== undefined) {
        payload.authConfig = parseJsonOption(authConfigJson, "--auth-config-json");
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("mcp update requires at least one field to update.");
      }

      await runWithAutoRefresh((accessToken) => options.apiClient.updateMcp(accessToken, id, payload));
      return;
    }

    if (parsed.command === "delete") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      await runWithAutoRefresh((accessToken) => options.apiClient.deleteMcp(accessToken, id));
      return;
    }

    if (parsed.command === "sync") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      await runWithAutoRefresh((accessToken) => options.apiClient.syncMcp(accessToken, id));
      return;
    }

    if (parsed.command === "capabilities") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      await runWithAutoRefresh((accessToken) => options.apiClient.listCapabilities(accessToken, id));
      return;
    }

    if (parsed.command === "auth") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      if (parsed.subcommand === "start") {
        const payloadJsonRaw = readStringOption(parsed.options, "payload-json");
        let payload: {
          connectionName?: string;
          returnUrl?: string;
          credentials?: unknown;
        };

        if (payloadJsonRaw !== undefined) {
          const hasConflict =
            readStringOption(parsed.options, "connection-name") !== undefined
            || readStringOption(parsed.options, "return-url") !== undefined
            || readStringOption(parsed.options, "credentials-json") !== undefined;
          if (hasConflict) {
            throw new Error("mcp auth start --payload-json cannot be used with other auth start options.");
          }
          const parsedPayload = parseJsonOption(payloadJsonRaw, "--payload-json");
          if (!isRecord(parsedPayload)) {
            throw new Error("--payload-json must be a JSON object.");
          }
          payload = parsedPayload as {
            connectionName?: string;
            returnUrl?: string;
            credentials?: unknown;
          };
        } else {
          payload = {
            connectionName: readStringOption(parsed.options, "connection-name"),
            returnUrl: readStringOption(parsed.options, "return-url"),
            credentials: parseJsonOption(readStringOption(parsed.options, "credentials-json"), "--credentials-json"),
          };
        }

        const response = await runWithAutoRefresh((accessToken) => options.apiClient.startMcpAuth(accessToken, id, payload));
        const success = readBooleanField(response.body, "success");
        if (response.ok && success === true) {
          appendLog("info", "MCP auth succeeded. Triggering capability sync...");
          await runWithAutoRefresh((accessToken) => options.apiClient.syncMcp(accessToken, id));
        }
        return;
      }

      if (parsed.subcommand === "status") {
        await runWithAutoRefresh((accessToken) => options.apiClient.getMcpAuthStatus(accessToken, id));
        return;
      }

      if (parsed.subcommand === "delete") {
        const connectionIdRaw = readStringOption(parsed.options, "connection-id");
        const connectionId = connectionIdRaw ? parsePositiveInt(connectionIdRaw, "connectionId") : undefined;
        await runWithAutoRefresh((accessToken) => options.apiClient.deleteMcpAuth(accessToken, id, connectionId));
        return;
      }
    }

    throw new Error("Unsupported mcp command.");
  }, [appendLog, options.apiClient, runWithAutoRefresh]);

  const executeSessionCommand = useCallback(async (parsed: ParsedCommandInput) => {
    if (parsed.command === "create") {
      const response = await runWithAutoRefresh((accessToken) => options.apiClient.createSession(accessToken, readStringOption(parsed.options, "title")));
      if (response.ok) {
        const sessionId = readTaskSessionId(response.body);
        if (sessionId !== null) {
          setActiveSessionId(sessionId);
          appendLog("success", `Switched to session ${sessionId}.`);
        }
      }
      return;
    }

    if (parsed.command === "list") {
      const pageRaw = readStringOption(parsed.options, "page");
      const sizeRaw = readStringOption(parsed.options, "size");
      await runWithAutoRefresh((accessToken) => options.apiClient.listSessions(accessToken, {
        status: readStringOption(parsed.options, "status"),
        page: pageRaw ? parsePositiveInt(pageRaw, "page") : undefined,
        size: sizeRaw ? parsePositiveInt(sizeRaw, "size") : undefined,
      }));
      return;
    }

    if (parsed.command === "get") {
      const sessionId = resolveNumericId("sessionId", parsed.positionals, parsed.options, "session-id");
      await runWithAutoRefresh((accessToken) => options.apiClient.getSession(accessToken, sessionId));
      return;
    }

    if (parsed.command === "use") {
      const sessionId = resolveNumericId("sessionId", parsed.positionals, parsed.options, "session-id");
      const response = await runWithAutoRefresh((accessToken) => options.apiClient.getSession(accessToken, sessionId));
      if (response.ok) {
        setActiveSessionId(sessionId);
        appendLog("success", `Active session set to ${sessionId}.`);
      }
      return;
    }

    if (parsed.command === "current") {
      if (activeSessionId === null) {
        appendLog("info", "No active session. Use `session create` or `session use <id>`.");
        return;
      }
      await runWithAutoRefresh((accessToken) => options.apiClient.getSession(accessToken, activeSessionId));
      return;
    }

    if (parsed.command === "leave") {
      setActiveSessionId(null);
      appendLog("success", "Left current session.");
      return;
    }

    throw new Error("Unsupported session command.");
  }, [activeSessionId, appendLog, options.apiClient, runWithAutoRefresh]);

  const executeAuthCommand = useCallback(async (parsed: ParsedCommandInput) => {
    if (parsed.command !== "refresh") {
      throw new Error("Unsupported auth command.");
    }
    if (parsed.positionals.length > 0) {
      throw new Error("auth refresh does not accept positional arguments.");
    }
    await refreshAccessToken("Manual auth refresh requested.", false);
  }, [refreshAccessToken]);

  const ensureActiveSession = useCallback((commandName: string): number => {
    if (activeSessionId === null) {
      throw new Error(`run ${commandName} requires an active session. Use \`session use <id>\` or \`session create\` first.`);
    }
    return activeSessionId;
  }, [activeSessionId]);

  const assertTaskBelongsToActiveSession = useCallback((taskBody: unknown, commandName: string, expectedSessionId: number) => {
    const taskSessionId = readTaskSessionId(taskBody);
    if (taskSessionId === null) {
      throw new Error(`run ${commandName} response missing sessionId.`);
    }
    if (taskSessionId !== expectedSessionId) {
      throw new Error(
        `Task belongs to session ${taskSessionId}, but active session is ${expectedSessionId}. Run \`session use ${taskSessionId}\` first.`,
      );
    }
  }, []);

  const executeRunEventsFollow = useCallback(async (taskId: number, expectedSessionId: number, controller: AbortController) => {
    const { signal } = controller;
    let accessToken = ensureLoggedIn();
    setStreamState("ok");
    let backoffMs = 1000;

    while (!stoppedRef.current && !signal.aborted) {
      let terminalEventReached = false;

      try {
        await trackRequest(() => subscribeTaskEvents({
          baseUrl: options.apiClient.baseUrl,
          token: accessToken,
          taskId,
          signal,
          onOpen: (response) => {
            printApiResponse(response);
            setStreamState("ok");
          },
          onEvent: (record) => {
            appendLog("info", JSON.stringify({ event: record.event, data: record.data }));
            if (TERMINAL_TASK_EVENTS.has(record.event.toLowerCase())) {
              terminalEventReached = true;
              controller.abort();
            }
          },
        }));
      } catch (error) {
        if (terminalEventReached) {
          appendLog("success", "SSE reached terminal event. Follow ended.");
          setStreamState("ok");
          return;
        }

        if (error instanceof SseHttpError) {
          printApiResponse(error.response);
          if (error.response.status === 401) {
            const refreshed = await refreshAccessToken("SSE unauthorized. Trying auth refresh...");
            if (!refreshed) {
              setStreamState("retry");
              return;
            }
            accessToken = refreshed;
            setStreamState("ok");
            continue;
          }
          if (!isRetriableHttpStatus(error.response.status)) {
            appendLog("error", `SSE follow stopped due to non-retriable status ${error.response.status}.`);
            setStreamState("ok");
            return;
          }
        } else if (error instanceof Error && error.name === "AbortError") {
          if (terminalEventReached) {
            appendLog("success", "SSE reached terminal event. Follow ended.");
          } else {
            appendLog("info", "Observer mode stopped.");
          }
          setStreamState("ok");
          return;
        } else {
          appendLog("error", `SSE connection error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (signal.aborted) {
        setStreamState("ok");
        return;
      }

      const probe = await runWithAutoRefresh((nextAccessToken) => options.apiClient.getTask(nextAccessToken, taskId));
      if (probe.status === 401) {
        setStreamState("retry");
        return;
      }

      if (probe.ok) {
        try {
          assertTaskBelongsToActiveSession(probe.body, "events", expectedSessionId);
        } catch (error) {
          appendLog("error", error instanceof Error ? error.message : String(error));
          setStreamState("ok");
          return;
        }
      }

      if (probe.ok && isTerminalTaskStatus(readTaskStatus(probe.body))) {
        appendLog("success", "Task already terminal. Follow ended.");
        setStreamState("ok");
        return;
      }
      if (!probe.ok && !isRetriableHttpStatus(probe.status)) {
        appendLog("error", `SSE follow stopped due to non-retriable status ${probe.status}.`);
        setStreamState("ok");
        return;
      }

      setStreamState("retry");
      appendLog("info", `SSE disconnected. Reconnecting in ${backoffMs / 1000}s...`);
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 8000);
    }
  }, [appendLog, assertTaskBelongsToActiveSession, ensureLoggedIn, options.apiClient, printApiResponse, refreshAccessToken, runWithAutoRefresh, trackRequest]);

  const executeRunCommand = useCallback(async (parsed: ParsedCommandInput) => {
    if (parsed.command === "submit") {
      const expectedSessionId = ensureActiveSession("submit");
      const objective = readStringOption(parsed.options, "objective");
      if (!objective || objective.trim() === "") {
        throw new Error("run submit requires --objective <text>.");
      }

      const sessionIdRaw = readStringOption(parsed.options, "session-id");
      const requestedSessionId = sessionIdRaw ? parsePositiveInt(sessionIdRaw, "sessionId") : expectedSessionId;
      if (requestedSessionId !== expectedSessionId) {
        throw new Error(
          `run submit must use active session ${expectedSessionId}. Run \`session use ${requestedSessionId}\` first.`,
        );
      }

      const response = await runWithAutoRefresh((accessToken) => options.apiClient.createTask(accessToken, {
        message: objective,
        sessionId: requestedSessionId,
      }));
      if (response.ok) {
        assertTaskBelongsToActiveSession(response.body, "submit", expectedSessionId);
        setActiveSessionId(readTaskSessionId(response.body));
      }
      return;
    }

    if (parsed.command === "status") {
      const expectedSessionId = ensureActiveSession("status");
      const taskId = resolveTaskId("status", parsed.positionals, parsed.options);
      const response = await runWithAutoRefresh((accessToken) => options.apiClient.getTask(accessToken, taskId));
      if (response.ok) {
        assertTaskBelongsToActiveSession(response.body, "status", expectedSessionId);
      }
      return;
    }

    if (parsed.command === "events") {
      const expectedSessionId = ensureActiveSession("events");
      const { follow, impliedTaskId } = parseFollowOption(parsed.options);
      if (!follow) {
        throw new Error("run events requires --follow <task_id>.");
      }
      const taskId = resolveTaskId("events", parsed.positionals, parsed.options, impliedTaskId);
      const probe = await runWithAutoRefresh((accessToken) => options.apiClient.getTask(accessToken, taskId));
      if (!probe.ok) {
        return;
      }
      assertTaskBelongsToActiveSession(probe.body, "events", expectedSessionId);
      if (followAbortRef.current) {
        followAbortRef.current.abort();
        followAbortRef.current = null;
      }
      const controller = new AbortController();
      const label = `run events --follow ${taskId}`;
      followAbortRef.current = controller;
      setIsFollowingEvents(true);
      appendLog("info", `Observer mode started: ${label}`);
      appendLog("info", "Press Ctrl+C to stop observing.");
      try {
        await executeRunEventsFollow(taskId, expectedSessionId, controller);
      } finally {
        if (followAbortRef.current === controller) {
          followAbortRef.current = null;
        }
        setIsFollowingEvents(false);
      }
      return;
    }

    if (parsed.command === "list") {
      ensureActiveSession("list");
      const pageRaw = readStringOption(parsed.options, "page");
      const sizeRaw = readStringOption(parsed.options, "size");
      await runWithAutoRefresh((accessToken) => options.apiClient.listTasks(accessToken, {
        status: readStringOption(parsed.options, "status"),
        page: pageRaw ? parsePositiveInt(pageRaw, "page") : undefined,
        size: sizeRaw ? parsePositiveInt(sizeRaw, "size") : undefined,
      }));
      return;
    }

    if (parsed.command === "cancel") {
      const expectedSessionId = ensureActiveSession("cancel");
      const taskId = resolveTaskId("cancel", parsed.positionals, parsed.options);
      const probe = await runWithAutoRefresh((accessToken) => options.apiClient.getTask(accessToken, taskId));
      if (!probe.ok) {
        return;
      }
      assertTaskBelongsToActiveSession(probe.body, "cancel", expectedSessionId);
      await runWithAutoRefresh((accessToken) => options.apiClient.cancelTask(accessToken, taskId));
      return;
    }

    throw new Error("Unsupported run command.");
  }, [appendLog, assertTaskBelongsToActiveSession, ensureActiveSession, executeRunEventsFollow, options.apiClient, runWithAutoRefresh]);

  const executeThemeCommand = useCallback(async (parsed: ParsedCommandInput) => {
    if (parsed.command === "list") {
      appendJsonBlock("info", {
        themes: THEME_NAMES,
      });
      return;
    }

    if (parsed.command === "current") {
      appendJsonBlock("info", {
        theme: options.themeName,
      });
      return;
    }

    if (parsed.command === "set") {
      const positional = parsed.positionals[0]?.trim();
      const optionName = readStringOption(parsed.options, "name")?.trim();
      if (parsed.positionals.length > 1) {
        throw new Error("theme set accepts only one positional theme name.");
      }
      if (positional && optionName && positional !== optionName) {
        throw new Error("Conflicting theme names between positional and --name.");
      }
      const rawThemeName = optionName ?? positional;
      if (!rawThemeName) {
        throw new Error("theme set requires <name> or --name <theme>.");
      }
      if (!isThemeName(rawThemeName)) {
        appendLog("error", `Unknown theme '${rawThemeName}'.`);
        appendJsonBlock("info", { available: THEME_NAMES });
        return;
      }

      await options.setThemeName(rawThemeName);
      setIsThemePickerOpen(false);
      appendLog("success", `Theme switched to '${rawThemeName}'.`);
      appendJsonBlock("info", { theme: rawThemeName, persisted: true });
      return;
    }

    throw new Error("Unsupported theme command.");
  }, [appendJsonBlock, appendLog, options]);

  const applyThemeFromPicker = useCallback(async (name: ThemeName) => {
    if (!isThemeName(name)) {
      appendLog("error", `Unknown theme '${name}'.`);
      appendJsonBlock("info", { available: THEME_NAMES });
      return;
    }
    await options.setThemeName(name);
    setIsThemePickerOpen(false);
    appendLog("success", `Theme switched to '${name}'.`);
    appendJsonBlock("info", { theme: name, persisted: true });
  }, [appendJsonBlock, appendLog, options]);

  const closeThemePicker = useCallback(() => {
    setIsThemePickerOpen(false);
  }, []);

  const stopActiveFollow = useCallback((): boolean => {
    if (!followAbortRef.current) {
      return false;
    }
    appendLog("info", "Stopping observer mode...");
    followAbortRef.current.abort();
    return true;
  }, [appendLog]);

  const handleSlashCommand = useCallback(async (parsed: Extract<ParsedShellInput, { kind: "slash" }>) => {
    if (parsed.name === "exit") {
      appendLog("info", "Exiting abc-cli...");
      options.onExit?.();
      return;
    }

    if (parsed.name === "login") {
      setLoginStep("await_username");
      loginDraftRef.current = { username: null };
      appendLog("info", "Login started. Enter username.");
      return;
    }

    if (parsed.name === "logout") {
      await clearAuthState();
      setActiveSessionId(null);
      appendLog("success", "Logged out. Local token removed.");
      return;
    }

    if (parsed.name === "mcp") {
      await executeMcpCommand({
        kind: "command",
        raw: "mcp list",
        group: "mcp",
        command: "list",
        positionals: [],
        options: {},
      });
      return;
    }

    if (parsed.name === "sessions") {
      await executeSessionCommand({
        kind: "command",
        raw: "session list",
        group: "session",
        command: "list",
        positionals: [],
        options: {},
      });
      return;
    }

    if (parsed.name === "theme") {
      setIsThemePickerOpen(true);
      appendLog("info", "Theme picker opened. Use Up/Down and Enter to apply.");
      appendJsonBlock("info", {
        current: options.themeName,
        themes: THEME_NAMES,
      });
    }
  }, [appendJsonBlock, appendLog, clearAuthState, executeMcpCommand, executeSessionCommand, options]);

  const submitInput = useCallback(async (rawInput?: string) => {
    const input = (rawInput ?? "").trim();
    if (!input) {
      return;
    }

    if (inFlightRef.current) {
      const running = runningCommandRef.current ?? "unknown";
      appendLog("error", `Another command is still running: ${running}. Please wait.`);
      return;
    }

    if (loginStep !== "idle") {
      if (input === "/exit") {
        appendLog("command", `> ${input}`);
        options.onExit?.();
        return;
      }
      await consumeLoginStep(input);
      return;
    }

    const parsed = parseShellInput(input);
    appendLog("command", `> ${input}`);

    if (parsed.kind === "text") {
      appendLog("error", "Unknown command. Use /login, /mcp, /sessions, /theme, auth/theme/mcp/session/run commands, or /exit.");
      return;
    }

    inFlightRef.current = true;
    runningCommandRef.current = input;
    setActiveCommandLabel(input);
    try {
      if (parsed.kind === "slash") {
        await handleSlashCommand(parsed);
        return;
      }

      if (parsed.group === "mcp") {
        await executeMcpCommand(parsed);
        return;
      }

      if (parsed.group === "auth") {
        await executeAuthCommand(parsed);
        return;
      }

      if (parsed.group === "session") {
        await executeSessionCommand(parsed);
        return;
      }

      if (parsed.group === "theme") {
        await executeThemeCommand(parsed);
        return;
      }

      await executeRunCommand(parsed);
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : String(error));
    } finally {
      inFlightRef.current = false;
      runningCommandRef.current = null;
      setActiveCommandLabel(null);
    }
  }, [appendLog, consumeLoginStep, executeAuthCommand, executeMcpCommand, executeRunCommand, executeSessionCommand, executeThemeCommand, handleSlashCommand, loginStep, options]);

  return {
    submitInput,
    logs,
    loginHint,
    isPasswordInput: loginStep === "await_password",
    isAwaitingLoginInput: loginStep !== "idle",
    authState,
    activeSessionId,
    streamState,
    pendingRequestCount,
    activeCommandLabel,
    isFollowingEvents,
    stopActiveFollow,
    appendClientLog,
    isThemePickerOpen,
    applyThemeFromPicker,
    closeThemePicker,
  };
}
