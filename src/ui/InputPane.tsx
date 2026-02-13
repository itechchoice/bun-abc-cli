import { type InputRenderable, TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { AppStatus, SurfacePhase } from "../state/types";
import { LoadingIndicator } from "./LoadingIndicator";

interface SlashSuggestion {
  command: string;
  description: string;
}

interface InputPaneProps {
  draft: string;
  status: AppStatus;
  surfacePhase: SurfacePhase;
  canSubmit: boolean;
  commandMode?: boolean;
  shellHint?: string | null;
  passwordMode?: boolean;
  slashSuggestions?: SlashSuggestion[];
  onInput: (value: string) => void;
  onSubmit: (value?: string) => Promise<void>;
}

function getPlaceholder(
  surfacePhase: SurfacePhase,
  status: AppStatus,
  commandMode: boolean,
  shellHint: string | null | undefined,
): string {
  if (shellHint) {
    return shellHint;
  }
  if (commandMode) {
    return "Type /login, /whoami, /mcp, or run/mcp commands. Plain text submits intent.";
  }
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

export function InputPane({
  draft,
  status,
  surfacePhase,
  canSubmit,
  commandMode = false,
  shellHint = null,
  passwordMode = false,
  slashSuggestions = [],
  onInput,
  onSubmit,
}: InputPaneProps) {
  const inputRef = useRef<InputRenderable | null>(null);
  const inputEnabled = commandMode ? true : surfacePhase !== "submitted" && surfacePhase !== "observing";
  const showSubmitting = status === "submitting";
  const showObserving = status === "observing";
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const showSlashMenu = commandMode && !passwordMode && draft.trim().startsWith("/") && slashSuggestions.length > 0;

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [draft, slashSuggestions]);

  useKeyboard((key) => {
    if (!showSlashMenu) {
      return;
    }
    if (key.name === "down") {
      setSelectedSlashIndex((prev) => Math.min(prev + 1, slashSuggestions.length - 1));
      return;
    }
    if (key.name === "up") {
      setSelectedSlashIndex((prev) => Math.max(prev - 1, 0));
    }
  });

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
    const rawValue = typeof arg === "string" ? arg : draft;
    const trimmed = rawValue.trim();
    if (showSlashMenu) {
      const exactMatch = slashSuggestions.find((item) => item.command === trimmed);
      if (!exactMatch) {
        const selected = slashSuggestions[selectedSlashIndex] ?? slashSuggestions[0];
        if (selected) {
          void onSubmit(selected.command);
          if (commandMode) {
            onInput("");
          }
          return;
        }
      }
    }
    void onSubmit(rawValue);
    if (commandMode) {
      onInput("");
    }
  };

  return (
    <box flexDirection="column" gap={1} flexShrink={0}>
      <box backgroundColor="#2A3748" paddingLeft={1} paddingRight={1}>
        <input
          ref={inputRef}
          value={draft}
          placeholder={getPlaceholder(surfacePhase, status, commandMode, shellHint)}
          onInput={onInput}
          onSubmit={handleSubmit}
          focused={inputEnabled}
          textColor={passwordMode ? "#2A3748" : "#D7DEE8"}
          focusedTextColor={passwordMode ? "#2A3748" : "#D7DEE8"}
          cursorColor={passwordMode ? "#9EDCAA" : "#D7DEE8"}
          width="100%"
        />
        {passwordMode && draft.length > 0 ? (
          <box position="absolute" top={0} left={1}>
            <text fg="#D7DEE8">{`${"*".repeat(draft.length)}`}</text>
          </box>
        ) : null}
      </box>
      {inputEnabled ? (
        <box flexDirection="column" gap={1}>
          <text attributes={TextAttributes.DIM}>
            {showSlashMenu
              ? "Use Up/Down to choose slash command, Enter to run"
                : (commandMode
                  ? "Enter to run command or submit intent"
                  : (canSubmit ? "Enter to submit intent" : "Waiting for intent input"))}
          </text>
          {passwordMode ? <text fg="#9EDCAA">{`Password: ${"*".repeat(draft.length)}`}</text> : null}
          {showSlashMenu ? (
            <box
              flexDirection="column"
              gap={0}
              backgroundColor="#1F2A3A"
              paddingLeft={1}
              paddingRight={1}
              flexShrink={0}
            >
              {slashSuggestions.map((item, index) => {
                const selected = index === selectedSlashIndex;
                return (
                  <box key={item.command} width="100%">
                    <text fg={selected ? "#F6D06E" : "#A8B1C2"}>
                      {`${selected ? ">" : " "} ${item.command}  ${item.description}`}
                    </text>
                  </box>
                );
              })}
            </box>
          ) : null}
        </box>
      ) : (
        <box flexDirection="row" gap={1}>
          <LoadingIndicator
            active={showSubmitting || showObserving}
            label={showSubmitting ? "submitting" : "observing"}
            variant="pixel"
            pattern={showSubmitting ? "pulse" : "spiral"}
            color="#8BD0FF"
          />
          <text attributes={TextAttributes.DIM}>Read-only observation in progress</text>
        </box>
      )}
    </box>
  );
}
