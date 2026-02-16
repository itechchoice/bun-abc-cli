/**
 * Shared types for command handlers.
 */

import type { PlatformApiClient } from "../../adapters/platform-api/client";
import type { ApiResponse } from "../../adapters/platform-api/types";
import type { ParsedCommandInput } from "../shell/types";
import type { ShellLogger } from "../../hooks/use-shell-log";
import type { ThemeName } from "../../theme/types";

export interface CommandContext {
  apiClient: PlatformApiClient;
  logger: ShellLogger;
  runWithAutoRefresh: (execute: (accessToken: string) => Promise<ApiResponse>) => Promise<ApiResponse>;
  activeSessionId: number | null;
  setActiveSessionId: (id: number | null) => void;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => Promise<void> | void;
  setIsThemePickerOpen: (open: boolean) => void;
  refreshAccessToken: (reasonLabel?: string, clearWhenMissing?: boolean) => Promise<string | null>;
  ensureLoggedIn: () => string;
  startFollow: (taskId: number, expectedSessionId: number) => Promise<void>;
}

export type CommandHandler = (ctx: CommandContext, parsed: ParsedCommandInput) => Promise<void>;
