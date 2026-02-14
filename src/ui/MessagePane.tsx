import { TextAttributes } from "@opentui/core";
import type { ShellLogEntry } from "../cli/shell/types";
import { GreetingBanner } from "./GreetingBanner";

interface MessagePaneProps {
  shellLogs: ShellLogEntry[];
}

export function MessagePane({ shellLogs }: MessagePaneProps) {
  const renderLogEntry = (entry: ShellLogEntry) => {
    const color = entry.level === "error"
      ? "#FF7C8A"
      : entry.level === "success"
        ? "#9EDCAA"
        : entry.level === "command"
          ? "#F6D06E"
          : "#D7DEE8";

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
    <box flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column">
      <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
        <box flexDirection="column" gap={1}>
          <GreetingBanner />
          <text attributes={TextAttributes.DIM}>Interactive shell mode. API-first, no local mock runtime.</text>
          <text attributes={TextAttributes.DIM}>Commands: /login, /mcp, /logout, /exit, mcp/session/run ...</text>
          <box flexDirection="column" gap={1}>
            <text fg="#8BD0FF">Command Log</text>
            {renderShellLogLines()}
          </box>
        </box>
      </scrollbox>
    </box>
  );
}
