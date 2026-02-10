import { TextAttributes } from "@opentui/core";
import type { ChatMessage } from "../state/types";

interface MessagePaneProps {
  messages: ChatMessage[];
}

function getRoleColor(role: ChatMessage["role"]): string {
  if (role === "assistant") {
    return "cyan";
  }
  if (role === "user") {
    return "green";
  }
  return "yellow";
}

export function MessagePane({ messages }: MessagePaneProps) {
  return (
    <box title="Messages" border flexGrow={1} padding={1}>
      {messages.length === 0 ? (
        <text attributes={TextAttributes.DIM}>No messages yet. Type a prompt and press Enter.</text>
      ) : (
        <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
          <box flexDirection="column" gap={1}>
            {messages.map((message) => (
              <box key={message.id} flexDirection="column">
                <text fg={getRoleColor(message.role)}>{message.role.toUpperCase()}</text>
                <text>{message.content}</text>
              </box>
            ))}
          </box>
        </scrollbox>
      )}
    </box>
  );
}
