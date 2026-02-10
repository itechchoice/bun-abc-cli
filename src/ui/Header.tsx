import { TextAttributes } from "@opentui/core";

export function Header() {
  return (
    <box border paddingLeft={1} paddingRight={1} flexDirection="row" justifyContent="space-between">
      <text>abc-cli (OpenTUI + React)</text>
      <text attributes={TextAttributes.DIM}>Ctrl+C exit | Ctrl+R reset | Esc clear error</text>
    </box>
  );
}
