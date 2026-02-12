import { useEffect, useState } from "react";

interface LoadingIndicatorProps {
  active: boolean;
  label?: string;
  intervalMs?: number;
  variant?: "spinner" | "dots" | "pixel";
  pattern?: "spiral" | "wave_lr" | "blink" | "pulse";
  color?: string;
  inactiveColor?: string;
}

const SPINNER_FRAMES = ["|", "/", "-", "\\"];
const DOTS_FRAMES = ["   ", ".  ", ".. ", "..."];
const PIXEL_PATTERNS: Record<NonNullable<LoadingIndicatorProps["pattern"]>, number[][]> = {
  spiral: [[0], [0, 1], [0, 1, 3], [1, 3], [3], [3, 2], [2], [2, 0]],
  wave_lr: [[0], [0, 1], [1], [1, 2], [2], [2, 3], [3], [3, 0]],
  blink: [[0, 1, 2, 3], [], [0, 3], [], [1, 2], []],
  pulse: [[0, 1, 2, 3], [1, 2], [0, 3], [1, 2], []],
};

function getTextFrames(variant: LoadingIndicatorProps["variant"]): string[] {
  if (variant === "dots") {
    return DOTS_FRAMES;
  }
  return SPINNER_FRAMES;
}

export function LoadingIndicator({
  active,
  label = "Loading",
  intervalMs = 120,
  variant = "spinner",
  pattern = "spiral",
  color = "#F6D06E",
  inactiveColor = "#3B4657",
}: LoadingIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = variant === "pixel" ? PIXEL_PATTERNS[pattern] : getTextFrames(variant);
  const effectiveIntervalMs = variant === "pixel" ? Math.max(intervalMs, 90) : intervalMs;

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, effectiveIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [active, effectiveIntervalMs, frames.length]);

  if (!active) {
    return null;
  }

  if (variant !== "pixel") {
    return <text fg={color}>{`${frames[frameIndex]} ${label}`}</text>;
  }

  const activeCells = new Set(frames[frameIndex] as number[]);
  const cells = [0, 1, 2, 3];

  return (
    <box flexDirection="row" gap={1}>
      <box flexDirection="row" gap={0}>
        {cells.map((cell) => (
          <text key={cell} fg={activeCells.has(cell) ? color : inactiveColor}>
            {activeCells.has(cell) ? "■" : "▪"}
          </text>
        ))}
      </box>
      <text fg={color}>{label}</text>
    </box>
  );
}
