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
  pendingRequestCount: number;
  activeSessionId: number | null;
  shellHint?: string | null;
  passwordMode?: boolean;
  historyBrowsing?: boolean;
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

function getPlaceholder(shellHint: string | null | undefined, activeSessionId: number | null): string {
  if (shellHint) {
    return shellHint;
  }
  if (activeSessionId !== null) {
    return `Active session ${activeSessionId}. run submit will use this session by default.`;
  }
  return "Use session use <id> before run commands. Type /login, /mcp, /theme, or auth/theme/mcp/session/run commands.";
}

export function InputPane({
  draft,
  palette,
  pendingRequestCount,
  activeSessionId,
  shellHint = null,
  passwordMode = false,
  historyBrowsing = false,
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
  const showSlashMenu = !passwordMode && !historyBrowsing && draft.trim().startsWith("/") && slashSuggestions.length > 0;
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
      <box backgroundColor={palette.inputBg} paddingLeft={1} paddingRight={1} flexDirection="row" alignItems="center" gap={1}>
        {pendingRequestCount > 0 ? (
          <box flexDirection="row" alignItems="center" gap={1} flexShrink={0}>
            <spinner name="dots" color={palette.accentWarning} />
            <text fg={palette.accentWarning}>{`loading(${pendingRequestCount})`}</text>
          </box>
        ) : null}

        <box flexGrow={1} minWidth={0}>
          <input
            ref={inputRef}
            value={draft}
            placeholder={getPlaceholder(shellHint, activeSessionId)}
            onInput={onInput}
            onSubmit={handleSubmit}
            focused
            textColor={passwordMode ? palette.inputBg : palette.textPrimary}
            focusedTextColor={passwordMode ? palette.inputBg : palette.textPrimary}
            cursorColor={passwordMode ? palette.mask : palette.cursor}
            width="100%"
          />
        </box>

        {passwordMode && draft.length > 0 ? (
          <box position="absolute" top={0} left={1}>
            <text fg={palette.textPrimary}>{`${"*".repeat(draft.length)}`}</text>
          </box>
        ) : null}
      </box>

      <box flexDirection="column" gap={1}>
        {activeSessionId !== null ? (
          <text fg={palette.accentSuccess}>{`Active session: ${activeSessionId} (run submit defaults to this session)`}</text>
        ) : null}

        <text fg={palette.textMuted} attributes={TextAttributes.DIM}>
          {showThemeMenu
            ? "Use Up/Down to choose theme, Enter to apply, Esc to close"
            : historyBrowsing
            ? "History browsing: Up/Down to navigate, Enter to run"
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
            border
            borderStyle="rounded"
            borderColor={palette.accentBrand}
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            {slashSuggestions.map((item, index) => {
              const isSelected = index === selectedSlashIndex;
              return (
                <box
                  key={item.command}
                  width="100%"
                  backgroundColor={isSelected ? palette.accentBrand : undefined}
                  paddingLeft={1}
                  paddingRight={1}
                >
                  <box flexDirection="row" gap={1} width="100%">
                    <text fg={isSelected ? palette.textInverse : palette.textPrimary}>
                      {isSelected ? "❯" : " "}
                    </text>
                    <text fg={isSelected ? palette.textInverse : palette.textPrimary}>
                      {item.command}
                    </text>
                    <text fg={isSelected ? palette.textInverse : palette.textMuted} attributes={isSelected ? 0 : TextAttributes.DIM}>
                      {item.description}
                    </text>
                  </box>
                </box>
              );
            })}
            {slashSuggestions.length > 6 ? (
              <text fg={palette.textMuted} attributes={TextAttributes.DIM}>{"  ▼ more"}</text>
            ) : null}
          </box>
        ) : null}

        {showThemeMenu ? (
          <box
            flexDirection="column"
            gap={0}
            backgroundColor={palette.panelBg}
            border
            borderStyle="rounded"
            borderColor={palette.accentBrand}
            paddingLeft={1}
            paddingRight={1}
            flexShrink={0}
          >
            {themeOptions.map((item, index) => {
              const isSelected = index === selectedThemeIndex;
              const active = item.name === activeThemeName;
              return (
                <box
                  key={item.name}
                  width="100%"
                  backgroundColor={isSelected ? palette.accentBrand : undefined}
                  paddingLeft={1}
                  paddingRight={1}
                >
                  <box flexDirection="row" gap={1} width="100%">
                    <text fg={isSelected ? palette.textInverse : palette.textPrimary}>
                      {isSelected ? "❯" : " "}
                    </text>
                    <text fg={isSelected ? palette.textInverse : palette.textPrimary}>
                      {item.name}
                    </text>
                    {active ? (
                      <text fg={isSelected ? palette.textInverse : palette.accentSuccess}>{"✓"}</text>
                    ) : null}
                    <text fg={isSelected ? palette.textInverse : palette.textMuted} attributes={isSelected ? 0 : TextAttributes.DIM}>
                      {item.description}
                    </text>
                  </box>
                </box>
              );
            })}
          </box>
        ) : null}
      </box>
    </box>
  );
}
