import { useEffect, useState } from "react";

interface LoadingIndicatorProps {
  active: boolean;
  label?: string;
  intervalMs?: number;
  variant?: "spinner" | "dots";
  color?: string;
}

const SPINNER_FRAMES = ["|", "/", "-", "\\"];
const DOTS_FRAMES = ["   ", ".  ", ".. ", "..."];

function getFrames(variant: LoadingIndicatorProps["variant"]): string[] {
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
  color = "#F6D06E",
}: LoadingIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = getFrames(variant);

  useEffect(() => {
    if (!active) {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [active, frames.length, intervalMs]);

  if (!active) {
    return null;
  }

  return <text fg={color}>{`${frames[frameIndex]} ${label}`}</text>;
}
