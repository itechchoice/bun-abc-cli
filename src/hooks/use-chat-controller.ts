import { useCallback, useRef } from "react";
import type { ProviderClient } from "../adapters/provider/types";
import type { SessionService } from "../services/session-service";
import { useAppDispatch, useAppState } from "./use-app-state";

interface UseChatControllerOptions {
  providerClient: ProviderClient;
  sessionService: SessionService;
}

function createMessageId(role: "user" | "assistant"): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${role}-${timestamp}-${randomPart}`;
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useChatController(options: UseChatControllerOptions) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const submitInFlightRef = useRef(false);

  const setDraft = useCallback(
    (value: string) => {
      if (submitInFlightRef.current || state.status === "thinking") {
        return;
      }

      dispatch({ type: "draft/set", value });
      if (state.status === "error") {
        dispatch({ type: "chat/clear_error" });
      }
    },
    [dispatch, state.status],
  );

  const submit = useCallback(
    async (rawPrompt?: string) => {
      const prompt = (rawPrompt ?? state.draft).trim();
      if (submitInFlightRef.current || state.status === "thinking" || prompt === "") {
        return;
      }

      submitInFlightRef.current = true;

      dispatch({
        type: "chat/submit_start",
        prompt,
        messageId: createMessageId("user"),
        ts: Date.now(),
      });

      try {
        const response = await options.providerClient.send({
          messages: state.messages,
          prompt,
        });

        dispatch({
          type: "chat/submit_success",
          reply: response.reply,
          messageId: createMessageId("assistant"),
          ts: Date.now(),
        });
      } catch (error) {
        dispatch({
          type: "chat/submit_error",
          errorText: toErrorText(error),
          draft: prompt,
        });
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [dispatch, options.providerClient, state.draft, state.messages, state.status],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "chat/clear_error" });
  }, [dispatch]);

  const resetSession = useCallback(() => {
    dispatch({ type: "session/reset", sessionId: options.sessionService.reset() });
  }, [dispatch, options.sessionService]);

  return {
    state,
    setDraft,
    submit,
    clearError,
    resetSession,
  };
}
