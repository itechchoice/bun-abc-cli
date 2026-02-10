import { TextAttributes } from "@opentui/core";

const GRADIENT_COLORS = ["#62A7FF", "#72B9F4", "#86CBE1", "#9ADBBE"];

export function GreetingBanner() {
  return (
    <box flexDirection="column" gap={1} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
      <box flexDirection="row" gap={1} alignItems="flex-start">
        <text fg="#C887FF" attributes={TextAttributes.BOLD}>
          &gt;
        </text>
        <ascii-font font="huge" text="ABC CLI" color={GRADIENT_COLORS} />
      </box>
      <text attributes={TextAttributes.DIM}>abc-cli preview | OpenTUI + React + TypeScript + Bun</text>
    </box>
  );
}
