import type { AppStatus, SurfacePhase } from "../state/types";

interface StatusBarProps {
  status: AppStatus;
  surfacePhase: SurfacePhase;
  sessionId: string;
  providerName: string;
  toolsLabel: string;
  activeExecutionId: string | null;
  errorSummary: string;
  reconnecting: boolean;
}

function getStatusColor(status: AppStatus): string {
  if (status === "submitting") {
    return "#F6D06E";
  }
  if (status === "error") {
    return "#FF7C8A";
  }
  if (status === "observing") {
    return "#8BD0FF";
  }
  return "#7DC4FF";
}

export function StatusBar({
  status,
  surfacePhase,
  sessionId,
  providerName,
  toolsLabel,
  activeExecutionId,
  errorSummary,
  reconnecting,
}: StatusBarProps) {
  const shortSessionId = sessionId.length > 8 ? sessionId.slice(-8) : sessionId;
  const shortExecutionId = activeExecutionId ? activeExecutionId.slice(-8) : "-";
  const shortError = errorSummary ? errorSummary.slice(0, 24) : "none";

  return (
    <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
      <text fg="#7DC4FF">{`sid:${shortSessionId} exec:${shortExecutionId}`}</text>
      <text fg={status === "error" ? "#FF7C8A" : "#8A93A6"}>
        {status === "error" ? `error:${shortError}` : `status:${status} phase:${surfacePhase}`}
      </text>
      <text fg={reconnecting ? "#F6D06E" : "#D384F8"}>{`${providerName} | ${toolsLabel} | ${reconnecting ? "reconnecting" : "stream:ok"}`}</text>
    </box>
  );
}
