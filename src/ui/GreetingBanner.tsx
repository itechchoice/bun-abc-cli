import { TextAttributes } from "@opentui/core";

const WORDMARK_LINES = [
  "  ███   ██████   ██████      █████  ██      ██",
  " █   █  █     █ █           █      ██      ██",
  "██████  ██████  █           █      ██      ██",
  "█    █  █     █ █           █      ██      ██",
  "█    █  ██████   ██████      █████ ███████ ██",
];

const GRADIENT = ["#62A7FF", "#6CB5F7", "#76C1EC", "#82CCD9", "#90D5C2", "#9EDCAA"];

function getGradientColor(index: number, total: number): string {
  const firstColor = GRADIENT[0] ?? "#62A7FF";
  if (total <= 1) {
    return firstColor;
  }

  const ratio = index / (total - 1);
  const paletteIndex = Math.min(GRADIENT.length - 1, Math.floor(ratio * GRADIENT.length));
  return GRADIENT[paletteIndex] ?? firstColor;
}

function GradientLine({ line }: { line: string }) {
  const chars = [...line];
  return (
    <text attributes={TextAttributes.BOLD}>
      {chars.map((char, index) => (
        <span key={`${line}-${index}`} fg={char === " " ? "#2d3a4a" : getGradientColor(index, chars.length)}>
          {char}
        </span>
      ))}
    </text>
  );
}

export function GreetingBanner() {
  return (
    <box flexDirection="column" gap={1} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
      <box flexDirection="column">
        {WORDMARK_LINES.map((line, index) => (
          <GradientLine key={index} line={line} />
        ))}
      </box>
      <text attributes={TextAttributes.DIM}>abc-cli preview | OpenTUI + React + TypeScript + Bun</text>
    </box>
  );
}
