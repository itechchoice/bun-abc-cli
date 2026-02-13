import { useKeyboard } from "@opentui/react";

interface UseShortcutsOptions {
  onResetSession: () => void;
  onClearError: () => void;
  onExit: () => void;
}

export function useShortcuts(options: UseShortcutsOptions): void {
  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      options.onExit();
      return;
    }

    if (key.ctrl && key.name === "r") {
      options.onResetSession();
      return;
    }

    if (key.name === "escape") {
      options.onClearError();
    }
  });
}
