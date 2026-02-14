interface StatusBarProps {
  apiLabel: string;
  authOn: boolean;
  activeSessionId: number | null;
  streamState: "ok" | "retry";
}

export function StatusBar({ apiLabel, authOn, activeSessionId, streamState }: StatusBarProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor="#1A2230"
      flexShrink={0}
    >
      <text fg="#7DC4FF">{`api:${apiLabel}`}</text>
      <text fg={authOn ? "#9EDCAA" : "#FF7C8A"}>{`auth:${authOn ? "on" : "off"}`}</text>
      <text fg="#D384F8">{`session:${activeSessionId ?? "-"} | stream:${streamState}`}</text>
    </box>
  );
}
