import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseBusinessContractDraft } from "../domain/business-contract";
import type { ExecutionStatus, ExecutionViewSnapshot, ProviderClient } from "../adapters/provider/types";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "../cli/shell/auth-token-store";
import { parseShellInput, readStringArrayOption, readStringOption } from "../cli/shell/parser";
import type { AuthSessionState, LoginStep, McpServerState, ParsedShellInput, ShellLogEntry, ShellLogLevel } from "../cli/shell/types";

interface UseShellCommandControllerOptions {
  providerClient: ProviderClient;
  sessionId: string;
  submitIntent: (rawPrompt?: string) => Promise<void>;
  onExit?: () => void;
}

const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const MAX_LOG_ENTRIES = 200;

function isTerminal(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function nextId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
}

function createMockToken(username: string): string {
  return `mock-token-${username}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readTokenUsername(token: string): string | null {
  const prefix = "mock-token-";
  if (!token.startsWith(prefix)) {
    return null;
  }
  const body = token.slice(prefix.length);
  const parts = body.split("-");
  if (parts.length < 3) {
    return null;
  }
  return parts.slice(0, parts.length - 2).join("-") || null;
}

function resolveExecutionId(
  commandName: "status" | "events" | "artifacts" | "result",
  positionals: string[],
  options: Record<string, string | boolean | string[]>,
  impliedExecutionId: string | null = null,
): string {
  const optionExecutionId = readStringOption(options, "execution-id");
  const positionalExecutionId = positionals[0]?.trim() || null;
  if (positionals.length > 1) {
    throw new Error(`run ${commandName} accepts at most one positional execution id.`);
  }

  const values = [optionExecutionId?.trim() || null, positionalExecutionId, impliedExecutionId]
    .filter((value): value is string => Boolean(value));
  const unique = new Set(values);
  if (unique.size > 1) {
    throw new Error(`Conflicting execution id values for run ${commandName}.`);
  }

  const executionId = values[0];
  if (!executionId) {
    throw new Error(`run ${commandName} requires <execution-id> or --execution-id <id>.`);
  }
  return executionId;
}

function parseFollowOption(options: Record<string, string | boolean | string[]>): { follow: boolean; impliedExecutionId: string | null } {
  const followRaw = options.follow;
  if (followRaw === undefined) {
    return { follow: false, impliedExecutionId: null };
  }
  const values = Array.isArray(followRaw) ? followRaw : [followRaw];
  let follow = false;
  let impliedExecutionId: string | null = null;

  for (const value of values) {
    if (value === true) {
      follow = true;
      continue;
    }
    if (typeof value === "string") {
      follow = true;
      const nextIdValue = value.trim();
      if (impliedExecutionId && impliedExecutionId !== nextIdValue) {
        throw new Error("Conflicting execution id values in --follow option.");
      }
      impliedExecutionId = nextIdValue;
      continue;
    }
    throw new Error("Invalid --follow option value.");
  }

  return { follow, impliedExecutionId };
}

export function useShellCommandController(options: UseShellCommandControllerOptions) {
  const [logs, setLogs] = useState<ShellLogEntry[]>([]);
  const [authState, setAuthState] = useState<AuthSessionState>({
    token: null,
    username: null,
    loginAt: null,
  });
  const [mcpServers, setMcpServers] = useState<McpServerState[]>([]);
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const loginDraftRef = useRef<{ username: string | null }>({ username: null });
  const inFlightRef = useRef(false);
  const pollingStoppedRef = useRef(false);

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

  useEffect(() => {
    pollingStoppedRef.current = false;
    void (async () => {
      try {
        const token = await loadAuthToken();
        if (!token) {
          return;
        }
        const username = readTokenUsername(token);
        if (!username) {
          await clearAuthToken();
          appendLog("error", "Found invalid local token. Cleared. Please run /login.");
          return;
        }
        setAuthState({
          token,
          username,
          loginAt: Date.now(),
        });
        appendLog("info", `Restored auth token for '${username}'.`);
      } catch (error) {
        appendLog("error", `Failed to restore auth token: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      pollingStoppedRef.current = true;
    };
  }, [appendLog]);

  const ensureLoggedIn = useCallback(() => {
    if (!authState.token) {
      throw new Error("Not logged in. Run /login first.");
    }
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

  const handleSlashCommand = useCallback(async (name: ParsedShellInput & { kind: "slash" }) => {
    if (name.name === "exit") {
      appendLog("info", "Exiting abc-cli...");
      options.onExit?.();
      return;
    }

    if (name.name === "login") {
      setLoginStep("await_username");
      loginDraftRef.current = { username: null };
      appendLog("info", "Login started. Enter username.");
      return;
    }

    if (name.name === "logout") {
      setAuthState({ token: null, username: null, loginAt: null });
      await clearAuthToken();
      appendLog("success", "Logged out. Local token removed.");
      return;
    }

    if (name.name === "whoami") {
      if (!authState.token) {
        appendLog("error", "Not logged in.");
        return;
      }
      const tokenTail = authState.token.slice(-8);
      appendLog("info", `username=${authState.username ?? "unknown"} token=...${tokenTail}`);
      return;
    }

    if (name.name === "mcp") {
      ensureLoggedIn();
      if (mcpServers.length === 0) {
        appendLog("info", "No MCP servers found.");
        return;
      }
      const rows = [...mcpServers].sort((a, b) => b.updatedAt - a.updatedAt);
      for (const item of rows) {
        appendLog("info", `${item.serverCode}  active  ${item.url}  ${item.version}`);
      }
    }
  }, [appendLog, authState.token, authState.username, ensureLoggedIn, mcpServers, options]);

  const handleMcpCommand = useCallback((parsed: Extract<ParsedShellInput, { kind: "command"; group: "mcp" }>) => {
    ensureLoggedIn();

    if (parsed.command === "add") {
      const serverCode = readStringOption(parsed.options, "server-code");
      const url = readStringOption(parsed.options, "url");
      const version = readStringOption(parsed.options, "version");
      if (!serverCode || !url || !version) {
        throw new Error("mcp add requires --server-code <code> --url <url> --version <v>.");
      }

      setMcpServers((prev) => {
        const now = Date.now();
        const existing = prev.find((item) => item.serverCode === serverCode);
        if (existing) {
          appendLog("success", `Updated MCP server '${serverCode}'.`);
          return prev.map((item) => (item.serverCode === serverCode
            ? {
              ...item,
              url,
              version,
              updatedAt: now,
            }
            : item));
        }
        appendLog("success", `Added MCP server '${serverCode}'.`);
        return [
          ...prev,
          {
            serverCode,
            url,
            version,
            updatedAt: now,
          },
        ];
      });
      return;
    }

    if (parsed.command === "list") {
      if (mcpServers.length === 0) {
        appendLog("info", "No MCP servers found.");
        return;
      }
      const rows = [...mcpServers].sort((a, b) => b.updatedAt - a.updatedAt);
      for (const item of rows) {
        appendLog("info", `${item.serverCode}  active  ${item.url}  ${item.version}`);
      }
      return;
    }

    if (parsed.command === "get") {
      const positionalCode = parsed.positionals[0];
      const optionCode = readStringOption(parsed.options, "server-code");
      const code = optionCode ?? positionalCode;
      if (!code) {
        throw new Error("mcp get requires <server-code>.");
      }
      const found = mcpServers.find((item) => item.serverCode === code);
      if (!found) {
        throw new Error(`MCP server '${code}' not found.`);
      }
      appendLog("info", `server_code=${found.serverCode}`);
      appendLog("info", `url=${found.url}`);
      appendLog("info", `version=${found.version}`);
    }
  }, [appendLog, ensureLoggedIn, mcpServers]);

  const handleRunCommand = useCallback(async (parsed: Extract<ParsedShellInput, { kind: "command"; group: "run" }>) => {
    ensureLoggedIn();

    if (parsed.command === "submit") {
      const objective = readStringOption(parsed.options, "objective");
      if (!objective || objective.trim() === "") {
        throw new Error("run submit requires --objective <text>.");
      }
      if (mcpServers.length === 0) {
        throw new Error("No MCP server registered. Run `mcp add --server-code <code> --url <url> --version <v>` first.");
      }
      const selectedMcp = [...mcpServers].sort((a, b) => b.updatedAt - a.updatedAt)[0]!;
      const strategy = readStringOption(parsed.options, "strategy") ?? "once";
      const contextRefs = readStringArrayOption(parsed.options, "context-ref");
      const constraints = readStringArrayOption(parsed.options, "constraint");
      const { contract } = parseBusinessContractDraft([
        `objective: ${objective}`,
        `context_refs: ${contextRefs.join(",")}`,
        `constraints: ${constraints.join(",")}`,
        `execution_strategy: ${strategy}`,
      ].join("\n"));

      const result = await options.providerClient.submitContract({
        sessionId: options.sessionId,
        contract,
        trigger: "interaction_surface",
      });
      appendLog("success", `execution_id=${result.executionId}`);
      appendLog("info", `contract_ref=${result.contractRef}`);
      appendLog("info", `selected_mcp=${selectedMcp.serverCode}`);
      return;
    }

    if (parsed.command === "status") {
      const executionId = resolveExecutionId("status", parsed.positionals, parsed.options);
      const snapshot = await options.providerClient.getExecutionView(executionId);
      appendLog("info", `execution_id=${snapshot.executionId}`);
      appendLog("info", `status=${snapshot.status}`);
      appendLog("info", `objective=${snapshot.objective}`);
      appendLog("info", `execution_strategy=${snapshot.executionStrategy}`);
      return;
    }

    if (parsed.command === "events") {
      const { follow, impliedExecutionId } = parseFollowOption(parsed.options);
      const executionId = resolveExecutionId("events", parsed.positionals, parsed.options, impliedExecutionId);
      const initial = await options.providerClient.getExecutionView(executionId);
      const emittedEventIds = new Set<string>();
      for (const event of initial.events) {
        emittedEventIds.add(event.id);
        appendLog("info", `[${new Date(event.ts).toLocaleTimeString("en-US", { hour12: false })}] ${event.type} ${event.message}`);
      }
      if (!follow || isTerminal(initial.status)) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        let finished = false;
        const finish = (callback: () => void) => {
          if (finished) {
            return;
          }
          finished = true;
          callback();
        };

        const pollToTerminal = async () => {
          while (!pollingStoppedRef.current) {
            const snapshot = await options.providerClient.getExecutionView(executionId);
            for (const event of snapshot.events) {
              if (emittedEventIds.has(event.id)) {
                continue;
              }
              emittedEventIds.add(event.id);
              appendLog("info", `[${new Date(event.ts).toLocaleTimeString("en-US", { hour12: false })}] ${event.type} ${event.message}`);
            }
            if (isTerminal(snapshot.status)) {
              return;
            }
            await new Promise((next) => setTimeout(next, 280));
          }
        };

        const subscription = options.providerClient.subscribeExecutionView(executionId, {
          onEvent: (event, snapshot) => {
            if (!emittedEventIds.has(event.id)) {
              emittedEventIds.add(event.id);
              appendLog("info", `[${new Date(event.ts).toLocaleTimeString("en-US", { hour12: false })}] ${event.type} ${event.message}`);
            }
            if (isTerminal(snapshot.status)) {
              finish(() => {
                subscription.unsubscribe();
                resolve();
              });
            }
          },
          onDisconnect: () => {
            void pollToTerminal()
              .then(() => finish(resolve))
              .catch((error) => finish(() => reject(error)));
          },
          onError: (error) => {
            finish(() => reject(error));
          },
        });
      });
      return;
    }

    if (parsed.command === "artifacts" || parsed.command === "result") {
      const executionId = resolveExecutionId(parsed.command, parsed.positionals, parsed.options);
      const snapshot = await options.providerClient.getExecutionView(executionId);
      if (snapshot.artifacts.length === 0) {
        appendLog("info", "No artifacts.");
        return;
      }
      for (const artifact of snapshot.artifacts) {
        appendLog("success", artifact);
      }
      return;
    }
  }, [appendLog, ensureLoggedIn, mcpServers, options.providerClient, options.sessionId]);

  const consumeLoginStep = useCallback(async (rawInput: string) => {
    const value = rawInput.trim();
    if (loginStep === "await_username") {
      if (!value) {
        appendLog("error", "Username cannot be empty. Enter username.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Username cannot start with '/'. Enter username only.");
        return;
      }
      loginDraftRef.current = { username: value };
      setLoginStep("await_password");
      appendLog("info", "Enter password (masked).");
      return;
    }

    if (loginStep === "await_password") {
      if (!value) {
        appendLog("error", "Password cannot be empty. Enter password.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Password cannot start with '/'. Enter password only.");
        return;
      }
      const username = loginDraftRef.current.username;
      if (!username) {
        setLoginStep("idle");
        appendLog("error", "Login flow state mismatch. Please run /login again.");
        return;
      }

      const token = createMockToken(username);
      await saveAuthToken(token);
      setAuthState({
        token,
        username,
        loginAt: Date.now(),
      });
      setLoginStep("idle");
      loginDraftRef.current = { username: null };
      appendLog("success", `Login succeeded for '${username}'.`);
    }
  }, [appendLog, loginStep]);

  const submitInput = useCallback(async (rawInput?: string) => {
    const input = (rawInput ?? "").trim();
    if (!input) {
      return;
    }
    if (inFlightRef.current) {
      appendLog("error", "Previous command is still running. Please wait.");
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
    if (input.startsWith("/") && parsed.kind === "text") {
      appendLog("error", "Unknown slash command. Supported: /login, /logout, /whoami, /mcp, /exit.");
      return;
    }
    if (parsed.kind === "text") {
      await options.submitIntent(input);
      return;
    }

    appendLog("command", `> ${input}`);
    inFlightRef.current = true;
    try {
      if (parsed.kind === "slash") {
        await handleSlashCommand(parsed);
        return;
      }
      if (parsed.group === "mcp") {
        handleMcpCommand(parsed);
        return;
      }
      if (parsed.group === "run") {
        await handleRunCommand(parsed);
      }
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : String(error));
    } finally {
      inFlightRef.current = false;
    }
  }, [appendLog, consumeLoginStep, handleMcpCommand, handleRunCommand, handleSlashCommand, loginStep, options]);

  return {
    submitInput,
    logs,
    loginHint,
    isPasswordInput: loginStep === "await_password",
    isAwaitingLoginInput: loginStep !== "idle",
    authState,
    mcpCount: mcpServers.length,
  };
}
