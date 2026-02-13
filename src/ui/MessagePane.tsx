import { TextAttributes } from "@opentui/core";
import type { ShellLogEntry } from "../cli/shell/types";
import type { ExecutionViewModel, SurfacePhase } from "../state/types";
import { GreetingBanner } from "./GreetingBanner";

interface MessagePaneProps {
  viewModel: ExecutionViewModel;
  surfacePhase: SurfacePhase;
  shellLogs: ShellLogEntry[];
}

function getStatusColor(status: ExecutionViewModel["status"]): string {
  if (status === "FAILED") {
    return "#FF7C8A";
  }
  if (status === "CANCELLED") {
    return "#E8AA68";
  }
  if (status === "COMPLETED") {
    return "#9EDCAA";
  }
  if (status === "RUNNING") {
    return "#8BD0FF";
  }
  return "#A8B1C2";
}

function formatTimestamp(ts: number | null): string {
  if (!ts) {
    return "-";
  }
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

export function MessagePane({ viewModel, surfacePhase, shellLogs }: MessagePaneProps) {
  const renderShellLogLines = () => {
    if (shellLogs.length === 0) {
      return (
        <text attributes={TextAttributes.DIM}>No command output yet.</text>
      );
    }
    return shellLogs.map((entry) => {
      const color = entry.level === "error"
        ? "#FF7C8A"
        : entry.level === "success"
          ? "#9EDCAA"
          : entry.level === "command"
            ? "#F6D06E"
            : "#D7DEE8";
      return (
        <text key={entry.id} fg={color}>
          {`[${new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false })}] ${entry.text}`}
        </text>
      );
    });
  };

  const renderEventLines = () => {
    if (viewModel.events.length === 0) {
      return <text attributes={TextAttributes.DIM}>No events yet.</text>;
    }
    return viewModel.events.map((event) => (
      <text key={event.id}>{`[${new Date(event.ts).toLocaleTimeString("en-US", { hour12: false })}] ${event.type} ${event.message}`}</text>
    ));
  };

  if (!viewModel.executionId) {
    return (
      <box flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column">
        <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
          <box flexDirection="column" gap={1}>
            <GreetingBanner />
            <text attributes={TextAttributes.DIM}>Non-Plane CLI: submit intent and observe execution (read-only).</text>
            <text attributes={TextAttributes.DIM}>No execution authority. No decision authority.</text>
            {surfacePhase === "terminal" ? <text fg="#F6D06E">Execution terminal. Start a new intent to create a new execution instance.</text> : null}
            <box flexDirection="column" gap={1}>
              <text fg="#8BD0FF">Command Log</text>
              {renderShellLogLines()}
            </box>
          </box>
        </scrollbox>
      </box>
    );
  }

  return (
    <box flexGrow={1} minHeight={0} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column">
      <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" justifyContent="space-between">
            <text fg="#7DC4FF">{`execution:${viewModel.executionId}`}</text>
            <text fg={getStatusColor(viewModel.status)}>{`status:${viewModel.status ?? "-"}`}</text>
          </box>
          <text fg="#A8B1C2">{`contract_ref:${viewModel.contractRef ?? "-"}`}</text>
          <text>{`objective: ${viewModel.objective}`}</text>
          <text fg="#A8B1C2">{`execution_strategy: ${viewModel.executionStrategy}`}</text>
          <text attributes={TextAttributes.DIM}>{`last_update: ${formatTimestamp(viewModel.lastUpdatedAt)} | mode: read-only observation`}</text>

          <box flexDirection="column" gap={1}>
            <text fg="#8BD0FF">DAG View</text>
            {viewModel.dagView.length === 0 ? (
              <text attributes={TextAttributes.DIM}>No DAG view yet.</text>
            ) : (
              <box flexDirection="column">
                {viewModel.dagView.map((node) => (
                  <text key={node}>{`- ${node}`}</text>
                ))}
              </box>
            )}
          </box>

          <box flexDirection="column" gap={1}>
            <text fg="#8BD0FF">Events</text>
            <box flexDirection="column">
              {renderEventLines()}
            </box>
          </box>

          <box flexDirection="column" gap={1}>
            <text fg="#8BD0FF">Artifacts</text>
            {viewModel.artifacts.length === 0 ? (
              <text attributes={TextAttributes.DIM}>No artifacts.</text>
            ) : (
              <box flexDirection="column">
                {viewModel.artifacts.map((artifact) => (
                  <text key={artifact}>{`- ${artifact}`}</text>
                ))}
              </box>
            )}
          </box>

          <box flexDirection="column" gap={1}>
            <text fg="#8BD0FF">Command Log</text>
            <box flexDirection="column">
              {renderShellLogLines()}
            </box>
          </box>
        </box>
      </scrollbox>
    </box>
  );
}
