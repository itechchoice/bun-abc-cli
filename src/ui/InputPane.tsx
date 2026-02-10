import { type InputRenderable, TextAttributes } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { AppStatus } from "../state/types";

interface InputPaneProps {
  draft: string;
  status: AppStatus;
  canSubmit: boolean;
  onInput: (value: string) => void;
  onSubmit: (value?: string) => Promise<void>;
}

export function InputPane({ draft, status, canSubmit, onInput, onSubmit }: InputPaneProps) {
  const inputRef = useRef<InputRenderable | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    if (inputRef.current.value !== draft) {
      inputRef.current.value = draft;
    }
  }, [draft]);

  const handleSubmit = (arg: unknown) => {
    const value = typeof arg === "string" ? arg : draft;
    void onSubmit(value);
  };

  return (
    <box flexDirection="column" gap={1}>
      <box title="Prompt" border paddingLeft={1} paddingRight={1}>
        <input
          ref={inputRef}
          value={draft}
          placeholder={status === "thinking" ? "Thinking..." : "Type prompt and press Enter"}
          onInput={onInput}
          onSubmit={handleSubmit}
          focused={status !== "thinking"}
        />
      </box>
      <text attributes={TextAttributes.DIM}>
        {canSubmit ? "Press Enter to submit" : "Input is empty or waiting for response"}
      </text>
    </box>
  );
}
