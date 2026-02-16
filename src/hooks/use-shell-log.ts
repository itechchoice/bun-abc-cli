/**
 * Logging hook — manages shell log entries with truncation.
 */

import { useCallback, useState } from "react";
import type { ApiResponse } from "../adapters/platform-api/types";
import type { ShellLogEntry, ShellLogLevel } from "../cli/shell/types";
import { MAX_LOG_ENTRIES } from "../constants";
import { nextId } from "../utils/json-helpers";

export interface ShellLogger {
  appendLog: (level: ShellLogLevel, text: string) => void;
  appendClientLog: (level: ShellLogLevel, text: string) => void;
  appendJsonBlock: (level: ShellLogLevel, value: unknown) => void;
  printApiResponse: (response: ApiResponse) => void;
}

export function useShellLog(): { logs: ShellLogEntry[]; logger: ShellLogger } {
  const [logs, setLogs] = useState<ShellLogEntry[]>([]);

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

  const printApiResponse = useCallback((response: ApiResponse) => {
    appendLog("info", `> ${response.method} ${response.path}`);
    appendLog(response.ok ? "success" : "error", `< STATUS ${response.status}`);
    appendJsonBlock(response.ok ? "info" : "error", response.body);
  }, [appendJsonBlock, appendLog]);

  const logger: ShellLogger = { appendLog, appendClientLog, appendJsonBlock, printApiResponse };

  return { logs, logger };
}
