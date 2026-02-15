import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformApiClient } from "../adapters/platform-api/client";
import { SseHttpError, subscribeTaskEvents } from "../adapters/platform-api/sse";
import type { ApiResponse, McpAuthType } from "../adapters/platform-api/types";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "../cli/shell/auth-token-store";
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

function readTaskStatus(input: unknown): string | null {
  return readStringField(input, "status");
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

export function useShellCommandController(options: UseShellCommandControllerOptions) {
  const [logs, setLogs] = useState<ShellLogEntry[]>([]);
  const [authState, setAuthState] = useState<AuthSessionState>({
    token: null,
    username: null,
    loginAt: null,
  });
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const [streamState, setStreamState] = useState<StreamState>("ok");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const loginDraftRef = useRef<{ username: string | null }>({ username: null });
  const inFlightRef = useRef(false);
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

  const appendJsonBlock = useCallback((level: ShellLogLevel, value: unknown) => {
    const pretty = JSON.stringify(value ?? null, null, 2);
    appendLog(level, pretty);
  }, [appendLog]);

  const printApiResponse = useCallback((response: ApiResponse) => {
    appendLog("info", `> ${response.method} ${response.path}`);
    appendLog(response.ok ? "success" : "error", `< STATUS ${response.status}`);
    appendJsonBlock(response.ok ? "info" : "error", response.body);
  }, [appendJsonBlock, appendLog]);

  const clearAuthState = useCallback(async () => {
    setAuthState({ token: null, username: null, loginAt: null });
    await clearAuthToken();
  }, []);

  const handleUnauthorized = useCallback(async (response: ApiResponse) => {
    if (response.status !== 401) {
      return;
    }
    await clearAuthState();
    appendLog("error", "Authorization expired or invalid (401). Local token cleared. Please run /login.");
  }, [appendLog, clearAuthState]);

  useEffect(() => {
    stoppedRef.current = false;

    void (async () => {
      try {
        const token = await loadAuthToken();
        if (!token) {
          return;
        }

        const probe = await options.apiClient.listSessions(token, { page: 1, size: 1 });
        printApiResponse(probe);

        if (!probe.ok) {
          await handleUnauthorized(probe);
          if (probe.status !== 401) {
            appendLog("error", "Stored token validation failed. Please run /login.");
            await clearAuthState();
          }
          return;
        }

        setAuthState({
          token,
          username: null,
          loginAt: Date.now(),
        });
        appendLog("success", "Restored access_token from local store.");
      } catch (error) {
        appendLog("error", `Failed to restore token: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      stoppedRef.current = true;
    };
  }, [appendLog, clearAuthState, handleUnauthorized, options.apiClient, printApiResponse]);

  useEffect(() => {
    if (!options.themeWarning || themeWarningLoggedRef.current) {
      return;
    }
    appendLog("error", options.themeWarning);
    themeWarningLoggedRef.current = true;
  }, [appendLog, options.themeWarning]);

  const ensureLoggedIn = useCallback((): string => {
    if (!authState.token) {
      throw new Error("Not logged in. Run /login first.");
    }
    return authState.token;
  }, [authState.token]);

  const loginHint = useMemo(() => {
    if (loginStep === "await_username") {
      return "login> enter username";
    }
    if (loginStep === "await_password") {
      return "login> enter password (masked)";
    }
    return null;
  }, [loginStep]);

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

      const response = await options.apiClient.login({ username, password: value });
      printApiResponse(response);

      if (!response.ok) {
        await handleUnauthorized(response);
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      const token = readStringField(response.body, "access_token");
      if (!token) {
        appendLog("error", "Login response missing access_token.");
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      await saveAuthToken(token);
      setAuthState({ token, username, loginAt: Date.now() });
      setLoginStep("idle");
      loginDraftRef.current = { username: null };
      appendLog("success", `Login succeeded for '${username}'.`);
    }
  }, [appendLog, handleUnauthorized, loginStep, options.apiClient, printApiResponse]);

  const executeMcpCommand = useCallback(async (parsed: ParsedCommandInput) => {
    const token = ensureLoggedIn();

    if (parsed.command === "add") {
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

      const response = await options.apiClient.createMcp(token, {
        server_code: serverCode,
        version,
        name: readStringOption(parsed.options, "name") ?? serverCode,
        description: readStringOption(parsed.options, "description"),
        endpoint,
        auth_type: authTypeRaw as McpAuthType,
        auth_config: parseJsonOption(readStringOption(parsed.options, "auth-config-json"), "--auth-config-json") ?? {},
      });
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "list") {
      const response = await options.apiClient.listMcp(token, {
        serverCode: readStringOption(parsed.options, "server-code"),
        status: readStringOption(parsed.options, "status"),
      });
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "get") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      const response = await options.apiClient.getMcp(token, id);
      printApiResponse(response);
      await handleUnauthorized(response);
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
        payload.auth_type = normalized;
      }
      if (authConfigJson !== undefined) {
        payload.auth_config = parseJsonOption(authConfigJson, "--auth-config-json");
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("mcp update requires at least one field to update.");
      }

      const response = await options.apiClient.updateMcp(token, id, payload);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "delete") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      const response = await options.apiClient.deleteMcp(token, id);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "sync") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      const response = await options.apiClient.syncMcp(token, id);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "capabilities") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      const response = await options.apiClient.listCapabilities(token, id);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "auth") {
      const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
      if (parsed.subcommand === "start") {
        const response = await options.apiClient.startMcpAuth(token, id, {
          connectionName: readStringOption(parsed.options, "connection-name"),
          returnUrl: readStringOption(parsed.options, "return-url"),
          credentials: parseJsonOption(readStringOption(parsed.options, "credentials-json"), "--credentials-json"),
        });
        printApiResponse(response);
        await handleUnauthorized(response);
        return;
      }

      if (parsed.subcommand === "status") {
        const response = await options.apiClient.getMcpAuthStatus(token, id);
        printApiResponse(response);
        await handleUnauthorized(response);
        return;
      }

      if (parsed.subcommand === "delete") {
        const connectionIdRaw = readStringOption(parsed.options, "connection-id");
        const connectionId = connectionIdRaw ? parsePositiveInt(connectionIdRaw, "connection_id") : undefined;
        const response = await options.apiClient.deleteMcpAuth(token, id, connectionId);
        printApiResponse(response);
        await handleUnauthorized(response);
        return;
      }
    }

    throw new Error("Unsupported mcp command.");
  }, [ensureLoggedIn, handleUnauthorized, options.apiClient, printApiResponse]);

  const executeSessionCommand = useCallback(async (parsed: ParsedCommandInput) => {
    const token = ensureLoggedIn();

    if (parsed.command === "create") {
      const response = await options.apiClient.createSession(token, readStringOption(parsed.options, "title"));
      printApiResponse(response);
      await handleUnauthorized(response);
      if (response.ok) {
        const sessionId = readNumberField(response.body, "session_id");
        setActiveSessionId(sessionId);
      }
      return;
    }

    if (parsed.command === "list") {
      const pageRaw = readStringOption(parsed.options, "page");
      const sizeRaw = readStringOption(parsed.options, "size");
      const response = await options.apiClient.listSessions(token, {
        status: readStringOption(parsed.options, "status"),
        page: pageRaw ? parsePositiveInt(pageRaw, "page") : undefined,
        size: sizeRaw ? parsePositiveInt(sizeRaw, "size") : undefined,
      });
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "get") {
      const sessionId = resolveNumericId("session_id", parsed.positionals, parsed.options, "session-id");
      const response = await options.apiClient.getSession(token, sessionId);
      printApiResponse(response);
      await handleUnauthorized(response);
      if (response.ok) {
        setActiveSessionId(sessionId);
      }
      return;
    }

    throw new Error("Unsupported session command.");
  }, [ensureLoggedIn, handleUnauthorized, options.apiClient, printApiResponse]);

  const executeRunEventsFollow = useCallback(async (token: string, taskId: number) => {
    setStreamState("ok");
    let backoffMs = 1000;

    while (!stoppedRef.current) {
      const controller = new AbortController();
      let terminalEventReached = false;

      try {
        await subscribeTaskEvents({
          baseUrl: options.apiClient.baseUrl,
          token,
          taskId,
          signal: controller.signal,
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
        });
      } catch (error) {
        if (terminalEventReached) {
          appendLog("success", "SSE reached terminal event. Follow ended.");
          setStreamState("ok");
          return;
        }

        if (error instanceof SseHttpError) {
          printApiResponse(error.response);
          await handleUnauthorized(error.response);
          if (error.response.status === 401) {
            setStreamState("retry");
            return;
          }
        } else if (error instanceof Error && error.name === "AbortError") {
          // user exit or explicit stop.
        } else {
          appendLog("error", `SSE connection error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const probe = await options.apiClient.getTask(token, taskId);
      printApiResponse(probe);
      await handleUnauthorized(probe);
      if (probe.status === 401) {
        setStreamState("retry");
        return;
      }

      if (probe.ok && isTerminalTaskStatus(readTaskStatus(probe.body))) {
        appendLog("success", "Task already terminal. Follow ended.");
        setStreamState("ok");
        return;
      }

      setStreamState("retry");
      appendLog("info", `SSE disconnected. Reconnecting in ${backoffMs / 1000}s...`);
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 8000);
    }
  }, [appendLog, handleUnauthorized, options.apiClient, printApiResponse]);

  const executeRunCommand = useCallback(async (parsed: ParsedCommandInput) => {
    const token = ensureLoggedIn();

    if (parsed.command === "submit") {
      const objective = readStringOption(parsed.options, "objective");
      if (!objective || objective.trim() === "") {
        throw new Error("run submit requires --objective <text>.");
      }

      const sessionIdRaw = readStringOption(parsed.options, "session-id");
      const sessionId = sessionIdRaw ? parsePositiveInt(sessionIdRaw, "session_id") : undefined;
      const response = await options.apiClient.createTask(token, {
        message: objective,
        session_id: sessionId,
      });
      printApiResponse(response);
      await handleUnauthorized(response);
      if (response.ok) {
        setActiveSessionId(readNumberField(response.body, "session_id"));
      }
      return;
    }

    if (parsed.command === "status") {
      const taskId = resolveTaskId("status", parsed.positionals, parsed.options);
      const response = await options.apiClient.getTask(token, taskId);
      printApiResponse(response);
      await handleUnauthorized(response);
      if (response.ok) {
        setActiveSessionId(readNumberField(response.body, "session_id"));
      }
      return;
    }

    if (parsed.command === "events") {
      const { follow, impliedTaskId } = parseFollowOption(parsed.options);
      if (!follow) {
        throw new Error("run events requires --follow <task_id>.");
      }
      const taskId = resolveTaskId("events", parsed.positionals, parsed.options, impliedTaskId);
      await executeRunEventsFollow(token, taskId);
      return;
    }

    if (parsed.command === "artifacts") {
      const taskId = resolveTaskId("artifacts", parsed.positionals, parsed.options);
      const response = await options.apiClient.getTaskArtifacts(token, taskId);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    if (parsed.command === "cancel") {
      const taskId = resolveTaskId("cancel", parsed.positionals, parsed.options);
      const response = await options.apiClient.cancelTask(token, taskId);
      printApiResponse(response);
      await handleUnauthorized(response);
      return;
    }

    throw new Error("Unsupported run command.");
  }, [ensureLoggedIn, executeRunEventsFollow, handleUnauthorized, options.apiClient, printApiResponse]);

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

    if (parsed.name === "theme") {
      setIsThemePickerOpen(true);
      appendLog("info", "Theme picker opened. Use Up/Down and Enter to apply.");
      appendJsonBlock("info", {
        current: options.themeName,
        themes: THEME_NAMES,
      });
    }
  }, [appendJsonBlock, appendLog, clearAuthState, executeMcpCommand, options]);

  const submitInput = useCallback(async (rawInput?: string) => {
    const input = (rawInput ?? "").trim();
    if (!input) {
      return;
    }

    if (inFlightRef.current) {
      appendLog("error", "Another command is still running. Please wait.");
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
      appendLog("error", "Unknown command. Use /login, /mcp, /theme, theme/mcp/session/run commands, or /exit.");
      return;
    }

    inFlightRef.current = true;
    try {
      if (parsed.kind === "slash") {
        await handleSlashCommand(parsed);
        return;
      }

      if (parsed.group === "mcp") {
        await executeMcpCommand(parsed);
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
    }
  }, [appendLog, consumeLoginStep, executeMcpCommand, executeRunCommand, executeSessionCommand, executeThemeCommand, handleSlashCommand, loginStep, options]);

  return {
    submitInput,
    logs,
    loginHint,
    isPasswordInput: loginStep === "await_password",
    isAwaitingLoginInput: loginStep !== "idle",
    authState,
    activeSessionId,
    streamState,
    isThemePickerOpen,
    applyThemeFromPicker,
    closeThemePicker,
  };
}
