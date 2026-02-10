import { TextAttributes } from "@opentui/core";

const GRADIENT_COLORS = ["#4A9EF5", "#5BB8E8", "#6DD0D0", "#86DEB0", "#A8E89C"];

export function GreetingBanner() {
  return (
    <box
      flexDirection="column"
      justifyContent="space-between"
      height={8}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      <box flexDirection="row" gap={1} alignItems="flex-start" height={5}>
        <text fg="#C887FF" attributes={TextAttributes.BOLD}>
          &gt;
        </text>
        <ascii-font font="block" text="ABC CLI" color={GRADIENT_COLORS} />
      </box>
      <text attributes={TextAttributes.DIM}>abc-cli preview | OpenTUI + React + TypeScript + Bun</text>
    </box>
  );
}
