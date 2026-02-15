import { type InputRenderable, TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { ThemeName, ThemePalette } from "../theme/types";

interface SlashSuggestion {
  command: string;
  description: string;
}

interface ThemeOption {
  name: ThemeName;
  description: string;
}

interface InputPaneProps {
  draft: string;
  palette: ThemePalette;
  shellHint?: string | null;
  passwordMode?: boolean;
  activeThemeName: ThemeName;
  themePickerOpen?: boolean;
  themeOptions?: ThemeOption[];
  slashSuggestions?: SlashSuggestion[];
  onHistoryPrev: () => string | null;
  onHistoryNext: () => string | null;
  onThemeSelect: (name: ThemeName) => Promise<void> | void;
  onThemePickerClose?: () => void;
  onInput: (value: string) => void;
  onSubmit: (value?: string) => Promise<void>;
}

function getPlaceholder(shellHint: string | null | undefined): string {
  if (shellHint) {
    return shellHint;
  }
  return "Type /login, /mcp, /theme, or theme/mcp/session/run commands.";
}

export function InputPane({
  draft,
  palette,
  shellHint = null,
  passwordMode = false,
  activeThemeName,
  themePickerOpen = false,
  themeOptions = [],
  slashSuggestions = [],
  onHistoryPrev,
  onHistoryNext,
  onThemeSelect,
  onThemePickerClose,
  onInput,
  onSubmit,
}: InputPaneProps) {
  const inputRef = useRef<InputRenderable | null>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const showSlashMenu = !passwordMode && draft.trim().startsWith("/") && slashSuggestions.length > 0;
  const showThemeMenu = !passwordMode && themePickerOpen && themeOptions.length > 0;

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    focusInput();
  }, []);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [draft, slashSuggestions]);

  useEffect(() => {
    if (!showThemeMenu) {
      setSelectedThemeIndex(0);
      return;
    }
    const index = themeOptions.findIndex((item) => item.name === activeThemeName);
    setSelectedThemeIndex(index >= 0 ? index : 0);
  }, [activeThemeName, showThemeMenu, themeOptions]);

  useKeyboard((key) => {
    if (!key.ctrl && !key.meta) {
      focusInput();
    }

    if (showThemeMenu) {
      if (key.name === "down") {
        setSelectedThemeIndex((prev) => Math.min(prev + 1, themeOptions.length - 1));
        return;
      }
      if (key.name === "up") {
        setSelectedThemeIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (key.name === "escape") {
        onThemePickerClose?.();
      }
      return;
    }

    if (!showSlashMenu) {
      if (!passwordMode && key.name === "up") {
        const nextDraft = onHistoryPrev();
        if (nextDraft !== null) {
          onInput(nextDraft);
        }
      }
      if (!passwordMode && key.name === "down") {
        const nextDraft = onHistoryNext();
        if (nextDraft !== null) {
          onInput(nextDraft);
        }
      }
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
    const rawValue = typeof arg === "string" ? arg : draft;
    const trimmed = rawValue.trim();

    if (showThemeMenu) {
      const selected = themeOptions[selectedThemeIndex] ?? themeOptions[0];
      if (selected) {
        void onThemeSelect(selected.name);
      }
      onInput("");
      focusInput();
      return;
    }

    if (showSlashMenu) {
      const exactMatch = slashSuggestions.find((item) => item.command === trimmed);
      if (!exactMatch) {
        const selected = slashSuggestions[selectedSlashIndex] ?? slashSuggestions[0];
        if (selected) {
          void onSubmit(selected.command);
          onInput("");
          return;
        }
      }
    }

    void onSubmit(rawValue);
    onInput("");
    focusInput();
  };

  return (
    <box flexDirection="column" gap={1} flexShrink={0}>
      <box backgroundColor={palette.inputBg} paddingLeft={1} paddingRight={1}>
        <input
          ref={inputRef}
          value={draft}
          placeholder={getPlaceholder(shellHint)}
          onInput={onInput}
          onSubmit={handleSubmit}
          focused
          textColor={passwordMode ? palette.inputBg : palette.textPrimary}
          focusedTextColor={passwordMode ? palette.inputBg : palette.textPrimary}
          cursorColor={passwordMode ? palette.mask : palette.cursor}
          width="100%"
        />
        {passwordMode && draft.length > 0 ? (
          <box position="absolute" top={0} left={1}>
            <text fg={palette.textPrimary}>{`${"*".repeat(draft.length)}`}</text>
          </box>
        ) : null}
      </box>

      <box flexDirection="column" gap={1}>
        <text fg={palette.textMuted} attributes={TextAttributes.DIM}>
          {showThemeMenu
            ? "Use Up/Down to choose theme, Enter to apply, Esc to close"
            : showSlashMenu
            ? "Use Up/Down to choose slash command, Enter to run"
            : "Enter to run command"}
        </text>

        {passwordMode ? <text fg={palette.mask}>{`Password: ${"*".repeat(draft.length)}`}</text> : null}

        {showSlashMenu ? (
          <box
            flexDirection="column"
            gap={0}
            backgroundColor={palette.panelBg}
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            {slashSuggestions.map((item, index) => {
              const selected = index === selectedSlashIndex;
              return (
                <box key={item.command} width="100%">
                  <text fg={selected ? palette.menuSelected : palette.menuNormal}>
                    {`${selected ? ">" : " "} ${item.command}  ${item.description}`}
                  </text>
                </box>
              );
            })}
          </box>
        ) : null}

        {showThemeMenu ? (
          <box
            flexDirection="column"
            gap={0}
            backgroundColor={palette.panelBg}
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            {themeOptions.map((item, index) => {
              const selected = index === selectedThemeIndex;
              const active = item.name === activeThemeName;
              return (
                <box key={item.name} width="100%">
                  <text fg={selected ? palette.menuSelected : palette.menuNormal}>
                    {`${selected ? ">" : " "} ${item.name}${active ? " (current)" : ""}  ${item.description}`}
                  </text>
                </box>
              );
            })}
          </box>
        ) : null}
      </box>
    </box>
  );
}
