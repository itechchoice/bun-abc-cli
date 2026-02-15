import { TextAttributes } from "@opentui/core";
import type { ThemeName } from "../theme/types";

interface GreetingBannerProps {
  themeName: ThemeName;
}

const DARK_GRADIENT_COLORS = [
  "#4285F4",
  "#4A9DE8",
  "#5BB8E8",
  "#6DD0D0",
  "#7DDAB8",
  "#86DEB0",
  "#5EC98A",
  "#34A853",
];

const LIGHT_GRADIENT_COLORS = [
  "#0B4F8C",
  "#145E9B",
  "#1A6AA6",
  "#227890",
  "#2B856F",
  "#2E8F5A",
  "#2F8D45",
  "#2C7A35",
];

export function GreetingBanner({ themeName }: GreetingBannerProps) {
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
  const gradientColors = themeName === "light-hc" ? LIGHT_GRADIENT_COLORS : DARK_GRADIENT_COLORS;

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
          <text key={i} selectable fg={gradientColors[i]}>
            {line}
          </text>
        ))}
      </box>
      <text selectable attributes={TextAttributes.DIM}>
        abc-cli preview | Powered by Alphabitcore
      </text>
    </box>
  );
}
