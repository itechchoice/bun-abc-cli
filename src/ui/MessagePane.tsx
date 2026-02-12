import { TextAttributes } from "@opentui/core";
import type { ExecutionViewModel, SurfacePhase } from "../state/types";

interface MessagePaneProps {
  viewModel: ExecutionViewModel;
  surfacePhase: SurfacePhase;
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

export function MessagePane({ viewModel, surfacePhase }: MessagePaneProps) {
  if (!viewModel.executionId) {
    return (
      <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column" gap={1}>
        <text attributes={TextAttributes.DIM}>Non-Plane Intent Ingress (CLI)</text>
        <text attributes={TextAttributes.DIM}>Submit only Business Contract. No execution authority, no decision authority.</text>
        <text attributes={TextAttributes.DIM}>Input format:</text>
        <text attributes={TextAttributes.DIM}>objective: ...</text>
        <text attributes={TextAttributes.DIM}>context_refs: ref://a,ref://b</text>
        <text attributes={TextAttributes.DIM}>constraints: read_only,no_destructive</text>
        <text attributes={TextAttributes.DIM}>execution_strategy: once | max_runs:3 | cron:0 */2 * * * | until_condition:...</text>
        {surfacePhase === "terminal" ? <text fg="#F6D06E">Execution terminal. Start a new intent to create a new execution instance.</text> : null}
      </box>
    );
  }

  return (
    <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1} flexDirection="column" gap={1}>
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
        <scrollbox flexGrow={1} scrollY stickyScroll stickyStart="bottom">
          <box flexDirection="column">
            {viewModel.events.map((event) => (
              <text key={event.id}>{`[${new Date(event.ts).toLocaleTimeString("en-US", { hour12: false })}] ${event.type} ${event.message}`}</text>
            ))}
          </box>
        </scrollbox>
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
    </box>
  );
}
