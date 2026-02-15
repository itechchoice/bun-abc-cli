import type { ThemeName, ThemePalette } from "../theme/types";

interface StatusBarProps {
  apiLabel: string;
  themeName: ThemeName;
  palette: ThemePalette;
  authOn: boolean;
  activeSessionId: number | null;
  streamState: "ok" | "retry";
  historyCount: number;
  activeCommandLabel: string | null;
}

export function StatusBar({
  apiLabel,
  themeName,
  palette,
  authOn,
  activeSessionId,
  streamState,
  historyCount,
  activeCommandLabel,
}: StatusBarProps) {
  const busyLabel = activeCommandLabel ? `busy:${activeCommandLabel}` : "busy:-";
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={palette.statusBg}
      flexShrink={0}
    >
      <text fg={palette.accentInfo}>{`api:${apiLabel}`}</text>
      <text fg={authOn ? palette.accentSuccess : palette.accentError}>{`auth:${authOn ? "on" : "off"}`}</text>
      <text fg={palette.accentBrand}>{`theme:${themeName} | session:${activeSessionId ?? "-"} | stream:${streamState} | history:${historyCount} | ${busyLabel}`}</text>
    </box>
  );
}
