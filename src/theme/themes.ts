import type { ThemeName, ThemePalette } from "./types";

export const THEME_NAMES: ThemeName[] = ["dark", "light-hc"];

export const THEMES: Record<ThemeName, ThemePalette> = {
  dark: {
    surfaceBg: "#111722",
    surfaceSubtleBg: "#1A2230",
    panelBg: "#1F2A3A",
    inputBg: "#2A3748",
    statusBg: "#1A2230",
    textPrimary: "#D7DEE8",
    textMuted: "#8A93A6",
    textInverse: "#10161F",
    accentInfo: "#7DC4FF",
    accentSuccess: "#9EDCAA",
    accentWarning: "#F6D06E",
    accentError: "#FF7C8A",
    accentBrand: "#D384F8",
    cursor: "#D7DEE8",
    mask: "#9EDCAA",
    menuSelected: "#F6D06E",
    menuNormal: "#A8B1C2",
  },
  "light-hc": {
    surfaceBg: "#F5F7FA",
    surfaceSubtleBg: "#E8EEF5",
    panelBg: "#DCE6F2",
    inputBg: "#C9D9EB",
    statusBg: "#D6E1EE",
    textPrimary: "#121820",
    textMuted: "#334155",
    textInverse: "#F9FBFF",
    accentInfo: "#005A9C",
    accentSuccess: "#0A7A2F",
    accentWarning: "#8A4B00",
    accentError: "#A80000",
    accentBrand: "#5B2C91",
    cursor: "#121820",
    mask: "#0A7A2F",
    menuSelected: "#8A4B00",
    menuNormal: "#334155",
  },
};

export function isThemeName(input: string): input is ThemeName {
  return THEME_NAMES.includes(input as ThemeName);
}
