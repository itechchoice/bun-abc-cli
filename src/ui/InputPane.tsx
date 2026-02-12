import { type InputRenderable, TextAttributes } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { AppStatus, SurfacePhase } from "../state/types";
import { LoadingIndicator } from "./LoadingIndicator";

interface InputPaneProps {
  draft: string;
  status: AppStatus;
  surfacePhase: SurfacePhase;
  canSubmit: boolean;
  onInput: (value: string) => void;
  onSubmit: (value?: string) => Promise<void>;
}

function getPlaceholder(surfacePhase: SurfacePhase, status: AppStatus): string {
  if (surfacePhase === "submitted") {
    return "Submitting Business Contract...";
  }
  if (surfacePhase === "observing") {
    return "Observation mode: input disabled until execution reaches terminal state.";
  }
  if (surfacePhase === "terminal") {
    return "Execution terminal. Type new objective to start a new intent.";
  }
  if (status === "error") {
    return "Fix draft and submit again.";
  }
  return "objective: ... (or plain text objective)";
}

export function InputPane({ draft, status, surfacePhase, canSubmit, onInput, onSubmit }: InputPaneProps) {
  const inputRef = useRef<InputRenderable | null>(null);
  const inputEnabled = surfacePhase !== "submitted" && surfacePhase !== "observing";
  const showSubmitting = status === "submitting";
  const showObserving = status === "observing";

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }
    if (inputRef.current.value !== draft) {
      inputRef.current.value = draft;
    }
  }, [draft]);

  const handleSubmit = (arg: unknown) => {
    if (!inputEnabled) {
      return;
    }
    const value = typeof arg === "string" ? arg : draft;
    void onSubmit(value);
  };

  return (
    <box flexDirection="column" gap={1}>
      <box backgroundColor="#2A3748" paddingLeft={1} paddingRight={1}>
        <input
          ref={inputRef}
          value={draft}
          placeholder={getPlaceholder(surfacePhase, status)}
          onInput={onInput}
          onSubmit={handleSubmit}
          focused={inputEnabled}
          width="100%"
        />
      </box>
      {inputEnabled ? (
        <text attributes={TextAttributes.DIM}>{canSubmit ? "Enter to submit intent" : "Waiting for intent input"}</text>
      ) : (
        <box flexDirection="row" gap={1}>
          <LoadingIndicator active={showSubmitting || showObserving} label={showSubmitting ? "submitting" : "observing"} color="#8BD0FF" />
          <text attributes={TextAttributes.DIM}>Read-only observation in progress</text>
        </box>
      )}
    </box>
  );
}
