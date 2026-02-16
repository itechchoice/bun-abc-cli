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
  const sessionLabel = activeSessionId === null ? "session: none" : `session: ${activeSessionId} (active)`;
  const sessionColor = activeSessionId === null ? palette.accentWarning : palette.accentSuccess;
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={palette.statusBg}
      flexShrink={0}
    >
      <box flexDirection="row" gap={0}>
        <text fg={sessionColor}>{`${sessionLabel} | `}</text>
        <text fg={palette.accentInfo}>{`api:${apiLabel}`}</text>
      </box>
      <text fg={authOn ? palette.accentSuccess : palette.accentError}>{`auth:${authOn ? "on" : "off"}`}</text>
      <box flexDirection="row" gap={0}>
        <text fg={palette.accentBrand}>{`theme:${themeName} | `}</text>
        <text fg={palette.accentBrand}>{`stream:${streamState} | history:${historyCount} | ${busyLabel}`}</text>
      </box>
    </box>
  );
}
