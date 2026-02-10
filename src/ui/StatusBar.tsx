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
    return "yellow";
  }
  if (status === "error") {
    return "red";
  }
  return "green";
}

export function StatusBar({ status, sessionId, providerName, toolsLabel, errorSummary }: StatusBarProps) {
  const shortSessionId = sessionId.length > 8 ? sessionId.slice(-8) : sessionId;
  const shortError = errorSummary ? errorSummary.slice(0, 12) : "none";

  return (
    <box border paddingLeft={1} paddingRight={1}>
      <text>
        <span fg={getStatusColor(status)}>{`st=${status}`}</span>
        {` | sid=${shortSessionId} | p=${providerName} | t=${toolsLabel} | `}
        <span fg="red">{`err=${shortError}`}</span>
      </text>
    </box>
  );
}
