import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadThemeNameWithWarning, saveThemeName } from "./store";
import { isThemeName, THEMES } from "./themes";
import type { ThemeName, ThemePalette } from "./types";

interface ThemeContextValue {
  themeName: ThemeName;
  palette: ThemePalette;
  themeWarning: string | null;
  setThemeName: (name: ThemeName) => Promise<void>;
}

const DEFAULT_THEME_NAME: ThemeName = "dark";

function resolveEnvThemeName(): { themeName: ThemeName | null; warning: string | null } {
  const raw = process.env.ABC_THEME?.trim();
  if (!raw) {
    return { themeName: null, warning: null };
  }

  if (!isThemeName(raw)) {
    return {
      themeName: null,
      warning: `Invalid ABC_THEME '${raw}', fallback to persisted/default theme.`,
    };
  }

  return { themeName: raw, warning: null };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const envResult = resolveEnvThemeName();
  const [themeName, setThemeNameState] = useState<ThemeName>(envResult.themeName ?? DEFAULT_THEME_NAME);
  const [themeWarning, setThemeWarning] = useState<string | null>(envResult.warning);

  useEffect(() => {
    if (envResult.themeName) {
      return;
    }

    void (async () => {
      const loaded = await loadThemeNameWithWarning();
      if (loaded.warning) {
        setThemeWarning((prev) => prev ?? loaded.warning);
      }
      if (loaded.themeName) {
        setThemeNameState(loaded.themeName);
      }
    })();
  }, [envResult.themeName]);

  const setThemeName = useCallback(async (name: ThemeName) => {
    setThemeNameState(name);
    await saveThemeName(name);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    themeName,
    palette: THEMES[themeName],
    themeWarning,
    setThemeName,
  }), [setThemeName, themeName, themeWarning]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
