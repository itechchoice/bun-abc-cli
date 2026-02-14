import { useKeyboard } from "@opentui/react";

interface UseShortcutsOptions {
  onExit: () => void;
  onClearInput?: () => void;
}

export function useShortcuts(options: UseShortcutsOptions): void {
  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      options.onExit();
      return;
    }

    if (key.name === "escape") {
      options.onClearInput?.();
    }
  });
}
