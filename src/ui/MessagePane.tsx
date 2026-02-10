import { TextAttributes } from "@opentui/core";
import type { ChatMessage } from "../state/types";

interface MessagePaneProps {
  messages: ChatMessage[];
}

function getRoleColor(role: ChatMessage["role"]): string {
  if (role === "assistant") {
    return "#8BD0FF";
  }
  if (role === "user") {
    return "#9EDCAA";
  }
  return "#F8D27A";
}

export function MessagePane({ messages }: MessagePaneProps) {
  return (
    <box flexGrow={1} paddingLeft={1} paddingRight={1}>
      {messages.length === 0 ? (
        <text attributes={TextAttributes.DIM}>Ready. Start typing in the input bar below.</text>
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
