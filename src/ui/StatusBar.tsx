import type { AppStatus } from "../state/types";

interface StatusBarProps {
  status: AppStatus;
  sessionId: string;
  providerName: string;
  toolsLabel: string;
  errorSummary: string;
}

function getStatusColor(status: AppStatus): string {
  if (status === "thinking") {
    return "#F6D06E";
  }
  if (status === "error") {
    return "#FF7C8A";
  }
  return "#7DC4FF";
}

export function StatusBar({ status, sessionId, providerName, toolsLabel, errorSummary }: StatusBarProps) {
  const shortSessionId = sessionId.length > 8 ? sessionId.slice(-8) : sessionId;
  const shortError = errorSummary ? errorSummary.slice(0, 16) : "none";

  return (
    <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
      <text fg="#7DC4FF">{`~/abc-cli | sid:${shortSessionId}`}</text>
      <text fg={status === "error" ? "#FF7C8A" : "#8A93A6"}>{status === "error" ? `error:${shortError}` : `status:${status}`}</text>
      <text fg="#D384F8">{`${providerName} | ${toolsLabel}`}</text>
    </box>
  );
}
