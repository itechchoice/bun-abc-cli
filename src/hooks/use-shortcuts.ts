import { useKeyboard } from "@opentui/react";

interface UseShortcutsOptions {
  onExit: () => void;
  onClearInput?: () => void;
  onInterrupt?: () => boolean;
}

export function useShortcuts(options: UseShortcutsOptions): void {
  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      if (options.onInterrupt?.()) {
        return;
      }
      options.onExit();
      return;
    }

    if (key.name === "escape") {
      options.onClearInput?.();
    }
  });
}
