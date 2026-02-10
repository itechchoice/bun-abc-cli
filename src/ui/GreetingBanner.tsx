import { TextAttributes } from "@opentui/core";

export function GreetingBanner() {
  // ASCII art: "> ABC CLI" in DOS Rebel font (same as Gemini CLI)
  const ART_LINES = [
    " ███         █████████   ███████████    █████████       █████████  █████       █████",
    "░░░███      ███░░░░░███ ░░███░░░░░███  ███░░░░░███     ███░░░░░███░░███       ░░███",
    "  ░░░███   ░███    ░███  ░███    ░███ ███     ░░░     ███     ░░░  ░███        ░███",
    "    ░░░███ ░███████████  ░██████████ ░███            ░███          ░███        ░███",
    "     ███░  ░███░░░░░███  ░███░░░░░███░███            ░███          ░███        ░███",
    "   ███░    ░███    ░███  ░███    ░███░░███     ███   ░░███     ███ ░███      █ ░███",
    " ███░      █████   █████ ███████████  ░░█████████     ░░█████████  ███████████ █████",
    "░░░       ░░░░░   ░░░░░ ░░░░░░░░░░░    ░░░░░░░░░       ░░░░░░░░░  ░░░░░░░░░░░ ░░░░░",
  ];

  // Gemini-style vertical gradient (Blue → Cyan → Green), one color per line
  const GRADIENT_COLORS = [
    "#4285F4",
    "#4A9DE8",
    "#5BB8E8",
    "#6DD0D0",
    "#7DDAB8",
    "#86DEB0",
    "#5EC98A",
    "#34A853",
  ];

  return (
    <box
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      <box flexDirection="column">
        {ART_LINES.map((line, i) => (
          <text key={i} fg={GRADIENT_COLORS[i]}>
            {line}
          </text>
        ))}
      </box>
      <text attributes={TextAttributes.DIM}>
        abc-cli preview | OpenTUI + React + TypeScript + Bun
      </text>
    </box>
  );
}
