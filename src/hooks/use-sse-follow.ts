/**
 * SSE follow hook — manages Server-Sent Events streaming with reconnection.
 */

import { useCallback, useRef, useState } from "react";
import { PlatformApiClient } from "../adapters/platform-api/client";
import { SseHttpError, subscribeTaskEvents } from "../adapters/platform-api/sse";
import { TERMINAL_TASK_EVENTS } from "../constants";
import { isRetriableHttpStatus, isTerminalTaskStatus, readTaskStatus, sleep } from "../utils/json-helpers";
import type { AuthActions } from "./use-auth";
import type { ShellLogger } from "./use-shell-log";

export type StreamState = "ok" | "retry";

interface UseSseFollowOptions {
  apiClient: PlatformApiClient;
  logger: ShellLogger;
  auth: AuthActions;
}

export function useSseFollow(options: UseSseFollowOptions) {
  const { apiClient, logger, auth } = options;
  const { appendLog, printApiResponse } = logger;
  const { ensureLoggedIn, refreshAccessToken, runWithAutoRefresh } = auth;

  const [isFollowingEvents, setIsFollowingEvents] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>("ok");

  const followAbortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const trackRequest = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    return await fn();
  }, []);

  const executeRunEventsFollow = useCallback(async (
    taskId: number,
    expectedSessionId: number,
    controller: AbortController,
  ) => {
    const { signal } = controller;
    let accessToken = ensureLoggedIn();
    setStreamState("ok");
    let backoffMs = 1000;

    while (!stoppedRef.current && !signal.aborted) {
      let terminalEventReached = false;

      try {
        await trackRequest(() => subscribeTaskEvents({
          baseUrl: apiClient.baseUrl,
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

      const probe = await runWithAutoRefresh((nextAccessToken) => apiClient.getTask(nextAccessToken, taskId));
      if (probe.status === 401) {
        setStreamState("retry");
        return;
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
  }, [appendLog, ensureLoggedIn, apiClient, printApiResponse, refreshAccessToken, runWithAutoRefresh, trackRequest]);

  const startFollow = useCallback(async (taskId: number, expectedSessionId: number) => {
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
  }, [appendLog, executeRunEventsFollow]);

  const stopActiveFollow = useCallback((): boolean => {
    if (!followAbortRef.current) {
      return false;
    }
    appendLog("info", "Stopping observer mode...");
    followAbortRef.current.abort();
    return true;
  }, [appendLog]);

  return {
    isFollowingEvents,
    streamState,
    startFollow,
    stopActiveFollow,
  };
}
