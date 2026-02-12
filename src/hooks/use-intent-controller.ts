import { useCallback, useEffect, useRef } from "react";
import { parseBusinessContractDraft } from "../domain/business-contract";
import type { ExecutionStatus, ExecutionViewSnapshot, ExecutionViewSubscription, ProviderClient } from "../adapters/provider/types";
import { assertInteractionSurfaceTrigger, assertSurfaceCanAcceptIntent } from "../guards/non-plane-guards";
import type { SessionService } from "../services/session-service";
import { useAppDispatch, useAppState } from "./use-app-state";

interface UseIntentControllerOptions {
  providerClient: ProviderClient;
  sessionService: SessionService;
}

const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const RECONNECT_DELAY_MS = 360;

function isTerminalStatus(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useIntentController(options: UseIntentControllerOptions) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const submitInFlightRef = useRef(false);
  const subscriptionRef = useRef<ExecutionViewSubscription | null>(null);
  const reconnectTimerRef = useRef<Timer | null>(null);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const clearStream = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearStream();
    };
  }, [clearStream]);

  const syncSnapshot = useCallback(
    (snapshot: ExecutionViewSnapshot) => {
      dispatch({ type: "observe/sync_snapshot", snapshot });
    },
    [dispatch],
  );

  const scheduleReconnect = useCallback(
    (executionId: string) => {
      if (reconnectTimerRef.current) {
        return;
      }
      reconnectTimerRef.current = setTimeout(async () => {
        reconnectTimerRef.current = null;
        try {
          const latest = latestStateRef.current;
          if (latest.activeExecutionId !== executionId || latest.viewModel.status === null || isTerminalStatus(latest.viewModel.status)) {
            return;
          }

          const snapshot = await options.providerClient.getExecutionView(executionId);
          syncSnapshot(snapshot);
          if (isTerminalStatus(snapshot.status)) {
            return;
          }

          subscriptionRef.current = options.providerClient.subscribeExecutionView(executionId, {
            onEvent: (_event, nextSnapshot) => {
              syncSnapshot(nextSnapshot);
            },
            onDisconnect: () => {
              dispatch({ type: "observe/disconnected" });
              scheduleReconnect(executionId);
            },
            onError: (error) => {
              dispatch({ type: "observe/error", errorText: toErrorText(error) });
              dispatch({ type: "observe/disconnected" });
              scheduleReconnect(executionId);
            },
          });
        } catch (error) {
          dispatch({ type: "observe/error", errorText: toErrorText(error) });
          scheduleReconnect(executionId);
        }
      }, RECONNECT_DELAY_MS);
    },
    [dispatch, options.providerClient, syncSnapshot],
  );

  const startObservation = useCallback(
    async (executionId: string) => {
      clearStream();
      dispatch({ type: "observe/start" });

      const snapshot = await options.providerClient.getExecutionView(executionId);
      syncSnapshot(snapshot);
      if (isTerminalStatus(snapshot.status)) {
        return;
      }

      subscriptionRef.current = options.providerClient.subscribeExecutionView(executionId, {
        onEvent: (_event, nextSnapshot) => {
          syncSnapshot(nextSnapshot);
        },
        onDisconnect: () => {
          dispatch({ type: "observe/disconnected" });
          scheduleReconnect(executionId);
        },
        onError: (error) => {
          dispatch({ type: "observe/error", errorText: toErrorText(error) });
          dispatch({ type: "observe/disconnected" });
          scheduleReconnect(executionId);
        },
      });
    },
    [clearStream, dispatch, options.providerClient, scheduleReconnect, syncSnapshot],
  );

  const setDraft = useCallback(
    (value: string) => {
      if (submitInFlightRef.current || state.surfacePhase === "submitted" || state.surfacePhase === "observing") {
        return;
      }

      if (state.surfacePhase === "terminal") {
        dispatch({ type: "intent/new" });
      }

      dispatch({ type: "draft/set", value });
      if (state.status === "error") {
        dispatch({ type: "chat/clear_error" });
      }
    },
    [dispatch, state.status, state.surfacePhase],
  );

  const submit = useCallback(
    async (rawPrompt?: string) => {
      const prompt = (rawPrompt ?? state.draft).trim();
      if (prompt === "" || submitInFlightRef.current) {
        return;
      }
      try {
        assertSurfaceCanAcceptIntent(state.surfacePhase);
      } catch {
        return;
      }

      let parsed;
      try {
        parsed = parseBusinessContractDraft(prompt);
      } catch (error) {
        dispatch({
          type: "intent/submit_error",
          errorText: toErrorText(error),
          draft: rawPrompt ?? state.draft,
        });
        return;
      }

      submitInFlightRef.current = true;
      dispatch({ type: "intent/submit_start", contract: parsed.contract });

      try {
        assertInteractionSurfaceTrigger("interaction_surface");
        const result = await options.providerClient.submitContract({
          sessionId: state.sessionId,
          contract: parsed.contract,
          trigger: "interaction_surface",
        });

        dispatch({
          type: "intent/submit_success",
          executionId: result.executionId,
          contractRef: result.contractRef,
        });

        await startObservation(result.executionId);
      } catch (error) {
        dispatch({
          type: "intent/submit_error",
          errorText: toErrorText(error),
          draft: parsed.normalizedDraft,
        });
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [dispatch, options.providerClient, startObservation, state.draft, state.sessionId, state.surfacePhase],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "chat/clear_error" });
  }, [dispatch]);

  const resetSession = useCallback(() => {
    clearStream();
    dispatch({ type: "session/reset", sessionId: options.sessionService.reset() });
  }, [clearStream, dispatch, options.sessionService]);

  return {
    state,
    setDraft,
    submit,
    clearError,
    resetSession,
  };
}
