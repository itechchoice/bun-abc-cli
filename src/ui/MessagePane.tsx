import { TextAttributes } from "@opentui/core";
import type { ShellLogEntry } from "../cli/shell/types";
import { GreetingBanner } from "./GreetingBanner";
import type { ThemeName, ThemePalette } from "../theme/types";

interface MessagePaneProps {
  shellLogs: ShellLogEntry[];
  palette: ThemePalette;
  themeName: ThemeName;
}

export function MessagePane({ shellLogs, palette, themeName }: MessagePaneProps) {
  const renderLogEntry = (entry: ShellLogEntry) => {
    const color = entry.level === "error"
      ? palette.accentError
      : entry.level === "success"
        ? palette.accentSuccess
        : entry.level === "command"
          ? palette.accentWarning
          : palette.textPrimary;

    const timestamp = `[${new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false })}] `;
    const lines = entry.text.split("\n");

    return (
      <box key={entry.id} flexDirection="column">
        <text fg={color}>{`${timestamp}${lines[0] ?? ""}`}</text>
        {lines.slice(1).map((line, index) => (
          <text key={`${entry.id}-line-${index}`} fg={color}>{line}</text>
        ))}
      </box>
    );
  };

  const renderShellLogLines = () => {
    if (shellLogs.length === 0) {
      return <text attributes={TextAttributes.DIM}>No command output yet.</text>;
    }

    return shellLogs.map((entry) => renderLogEntry(entry));
  };

  return (
    <box flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column" backgroundColor={palette.surfaceBg}>
      <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
        <box flexDirection="column" gap={1}>
          <GreetingBanner themeName={themeName} />
          <text fg={palette.textMuted} attributes={TextAttributes.DIM}>Interactive shell mode. API-first, no local mock runtime.</text>
          <text fg={palette.textMuted} attributes={TextAttributes.DIM}>Commands: /login, /mcp, /logout, /exit, theme/mcp/session/run ...</text>
          <box flexDirection="column" gap={1}>
            <text fg={palette.accentInfo}>Command Log</text>
            {renderShellLogLines()}
          </box>
        </box>
      </scrollbox>
    </box>
  );
}
