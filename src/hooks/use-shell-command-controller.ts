/**
 * Shell command controller — thin orchestrator that composes sub-hooks
 * and dispatches commands to the appropriate handler.
 *
 * Reduced from ~1190 lines to ~170 lines.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { PlatformApiClient } from "../adapters/platform-api/client";
import { parseShellInput } from "../cli/shell/parser";
import type { ParsedShellInput, ShellLogEntry } from "../cli/shell/types";
import { THEME_NAMES, isThemeName } from "../theme/themes";
import type { ThemeName } from "../theme/types";

import { executeAuthCommand } from "../cli/commands/auth";
import { executeMcpCommand } from "../cli/commands/mcp";
import { executeRunCommand } from "../cli/commands/run";
import { executeSessionCommand } from "../cli/commands/session";
import { executeThemeCommand, applyThemeFromPicker as doApplyTheme } from "../cli/commands/theme";
import type { CommandContext } from "../cli/commands/types";

import { useAuth } from "./use-auth";
import { useShellLog } from "./use-shell-log";
import { useSseFollow } from "./use-sse-follow";

interface ToastFn {
  (message: string): void;
  success: (message: string) => void;
  error: (message: string) => void;
}

interface UseShellCommandControllerOptions {
  apiClient: PlatformApiClient;
  themeName: ThemeName;
  themeWarning?: string | null;
  setThemeName: (name: ThemeName) => Promise<void> | void;
  onExit?: () => void;
  onLogoutRequest?: () => Promise<boolean>;
  onToast?: ToastFn;
}

export function useShellCommandController(options: UseShellCommandControllerOptions) {
  const { logs, logger } = useShellLog();
  const { appendLog, appendJsonBlock } = logger;

  const auth = useAuth({
    apiClient: options.apiClient,
    logger,
    themeWarning: options.themeWarning,
  });

  const sse = useSseFollow({
    apiClient: options.apiClient,
    logger,
    auth,
  });

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [activeCommandLabel, setActiveCommandLabel] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const runningCommandRef = useRef<string | null>(null);

  // ---- build command context ----

  const ctx = useMemo<CommandContext>(() => ({
    apiClient: options.apiClient,
    logger,
    runWithAutoRefresh: auth.runWithAutoRefresh,
    activeSessionId,
    setActiveSessionId,
    themeName: options.themeName,
    setThemeName: options.setThemeName,
    setIsThemePickerOpen,
    refreshAccessToken: auth.refreshAccessToken,
    ensureLoggedIn: auth.ensureLoggedIn,
    startFollow: sse.startFollow,
  }), [options.apiClient, logger, auth.runWithAutoRefresh, activeSessionId, options.themeName, options.setThemeName, auth.refreshAccessToken, auth.ensureLoggedIn, sse.startFollow]);

  // ---- slash command dispatch ----

  const handleSlashCommand = useCallback(async (parsed: Extract<ParsedShellInput, { kind: "slash" }>) => {
    if (parsed.name === "exit") {
      appendLog("info", "Exiting abc-cli...");
      options.onExit?.();
      return;
    }

    if (parsed.name === "login") {
      auth.startLogin();
      return;
    }

    if (parsed.name === "logout") {
      if (options.onLogoutRequest) {
        const confirmed = await options.onLogoutRequest();
        if (!confirmed) {
          appendLog("info", "Logout cancelled.");
          return;
        }
      }
      await auth.clearAuthState();
      setActiveSessionId(null);
      appendLog("success", "Logged out. Local token removed.");
      options.onToast?.success("Logged out successfully");
      return;
    }

    if (parsed.name === "mcp") {
      await executeMcpCommand(ctx, {
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
      await executeSessionCommand(ctx, {
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
  }, [appendJsonBlock, appendLog, auth, ctx, options]);

  // ---- main input entry point ----

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

    if (auth.loginStep !== "idle") {
      if (input === "/exit") {
        appendLog("command", `> ${input}`);
        options.onExit?.();
        return;
      }
      await auth.consumeLoginStep(input);
      return;
    }

    const parsed = parseShellInput(input);
    appendLog("command", `> ${input}`);

    if (parsed.kind === "text") {
      appendLog("error", "Unknown command. Use /login, /mcp, /sessions, /theme, /logout, /exit, auth/theme/mcp/session/run commands, or /exit.");
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

      const handlers: Record<string, (ctx: CommandContext, parsed: any) => Promise<void>> = {
        mcp: executeMcpCommand,
        auth: executeAuthCommand,
        session: executeSessionCommand,
        theme: executeThemeCommand,
        run: executeRunCommand,
      };

      const handler = handlers[parsed.group];
      if (handler) {
        await handler(ctx, parsed);
      } else {
        await executeRunCommand(ctx, parsed);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      appendLog("error", msg);
      options.onToast?.error(msg);
    } finally {
      inFlightRef.current = false;
      runningCommandRef.current = null;
      setActiveCommandLabel(null);
    }
  }, [appendLog, auth, ctx, handleSlashCommand, options]);

  // ---- theme picker helpers ----

  const applyThemeFromPicker = useCallback(async (name: ThemeName) => {
    await doApplyTheme(ctx, name);
  }, [ctx]);

  const closeThemePicker = useCallback(() => {
    setIsThemePickerOpen(false);
  }, []);

  // ---- login hint (includes SSE follow state) ----

  const loginHint = useMemo(() => {
    if (sse.isFollowingEvents) {
      return "observer mode> following events (Ctrl+C to stop)";
    }
    return auth.loginHint;
  }, [sse.isFollowingEvents, auth.loginHint]);

  return {
    submitInput,
    logs,
    loginHint,
    isPasswordInput: auth.isPasswordInput,
    isAwaitingLoginInput: auth.isAwaitingLoginInput,
    authState: auth.authState,
    activeSessionId,
    streamState: sse.streamState,
    pendingRequestCount: auth.pendingRequestCount,
    activeCommandLabel,
    isFollowingEvents: sse.isFollowingEvents,
    stopActiveFollow: sse.stopActiveFollow,
    appendClientLog: logger.appendClientLog,
    isThemePickerOpen,
    applyThemeFromPicker,
    closeThemePicker,
  };
}
