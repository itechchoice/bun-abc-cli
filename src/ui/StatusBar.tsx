import type { AppStatus, SurfacePhase } from "../state/types";
import { LoadingIndicator } from "./LoadingIndicator";

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
  const showSubmitting = status === "submitting";
  const showObserving = status === "observing";

  return (
    <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
      <text fg="#7DC4FF">{`sid:${shortSessionId} exec:${shortExecutionId}`}</text>
      <box flexDirection="row" gap={1}>
        {showSubmitting ? <LoadingIndicator active label="submitting" variant="pixel" pattern="pulse" color="#F6D06E" /> : null}
        {showObserving && !reconnecting ? <LoadingIndicator active label="observing" variant="pixel" pattern="spiral" color="#8BD0FF" /> : null}
        <text fg={status === "error" ? "#FF7C8A" : "#8A93A6"}>
          {status === "error" ? `error:${shortError}` : `status:${status} phase:${surfacePhase}`}
        </text>
      </box>
      <box flexDirection="row" gap={1}>
        {reconnecting ? <LoadingIndicator active label="reconnecting" variant="pixel" pattern="wave_lr" color="#F6D06E" /> : null}
        <text fg={reconnecting ? "#F6D06E" : "#D384F8"}>{`${providerName} | ${toolsLabel} | ${reconnecting ? "stream:retry" : "stream:ok"}`}</text>
      </box>
    </box>
  );
}
