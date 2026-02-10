import { useKeyboard, useRenderer } from "@opentui/react";

interface UseShortcutsOptions {
  onResetSession: () => void;
  onClearError: () => void;
}

export function useShortcuts(options: UseShortcutsOptions): void {
  const renderer = useRenderer();

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      renderer.destroy();
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
