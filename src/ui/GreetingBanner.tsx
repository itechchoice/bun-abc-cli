import { TextAttributes } from "@opentui/core";

export function GreetingBanner() {
  return (
    <box border paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} flexDirection="row" justifyContent="space-between" alignItems="center">
      <box flexDirection="column">
        <ascii-font font="tiny" text="abc" />
        <text attributes={TextAttributes.DIM}>Build with confidence. Ship with clarity.</text>
      </box>
      <box flexDirection="column" alignItems="flex-end">
        <text fg="cyan">abc-cli preview</text>
        <text attributes={TextAttributes.DIM}>OpenTUI + React + TypeScript + Bun</text>
      </box>
    </box>
  );
}
