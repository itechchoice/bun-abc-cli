import { TextAttributes } from "@opentui/core";
import type { ShellLogEntry, ShellLogLevel } from "../cli/shell/types";
import { GreetingBanner } from "./GreetingBanner";
import type { ThemeName, ThemePalette } from "../theme/types";

interface MessagePaneProps {
  shellLogs: ShellLogEntry[];
  palette: ThemePalette;
  themeName: ThemeName;
}

function logLevelColor(level: ShellLogLevel, palette: ThemePalette): string {
  const LOG_COLORS: Record<ShellLogLevel, string> = {
    error: palette.accentError,
    success: palette.accentSuccess,
    command: palette.accentWarning,
    info: palette.textPrimary,
  };
  return LOG_COLORS[level] ?? palette.textPrimary;
}

export function MessagePane({ shellLogs, palette, themeName }: MessagePaneProps) {
  const renderLogEntry = (entry: ShellLogEntry) => {
    const color = logLevelColor(entry.level, palette);

    const timestamp = `[${new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false })}] `;
    const lines = entry.text.split("\n");

    return (
      <box key={entry.id} flexDirection="column">
        <text selectable fg={color}>{`${timestamp}${lines[0] ?? ""}`}</text>
        {lines.slice(1).map((line, index) => (
          <text key={`${entry.id}-line-${index}`} selectable fg={color}>{line}</text>
        ))}
      </box>
    );
  };

  const renderShellLogLines = () => {
    if (shellLogs.length === 0) {
      return <text selectable attributes={TextAttributes.DIM}>No command output yet.</text>;
    }

    return shellLogs.map((entry) => renderLogEntry(entry));
  };

  return (
    <box flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column" backgroundColor={palette.surfaceBg}>
      <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
        <box flexDirection="column" gap={1}>
          <GreetingBanner themeName={themeName} />
          <text selectable fg={palette.textMuted} attributes={TextAttributes.DIM}>Interactive shell mode. API-first, no local mock runtime.</text>
          <text selectable fg={palette.textMuted} attributes={TextAttributes.DIM}>Commands: /login, /mcp, /theme, /logout, /exit, auth/theme/mcp/session/run ...</text>
          <box flexDirection="column" gap={1}>
            <text selectable fg={palette.accentInfo}>Command Log</text>
            {renderShellLogLines()}
          </box>
        </box>
      </scrollbox>
    </box>
  );
}
