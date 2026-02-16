import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import "opentui-spinner/react";
import { DialogProvider } from "@opentui-ui/dialog/react";
import { Toaster } from "@opentui-ui/toast/react";
import { PlatformApiClient } from "./adapters/platform-api/client";
import { createMemoryConfigService } from "./services/memory-config-service";
import { ThemeProvider } from "./theme/context";
import { AppShell } from "./ui/AppShell";

const configService = createMemoryConfigService();
const runtimeConfig = configService.getRuntimeConfig();
const apiClient = new PlatformApiClient(runtimeConfig.apiBaseUrl);

function App() {
  return (
    <ThemeProvider>
      <DialogProvider
        size="medium"
        backdropOpacity={0.35}
        dialogOptions={{ style: { backgroundColor: "#1e1e2e" } }}
      >
        <AppShell apiClient={apiClient} configService={configService} />
        <Toaster
          position="bottom-right"
          visibleToasts={3}
          stackingMode="stack"
          toastOptions={{
            style: {
              backgroundColor: "#1e1e2e",
              foregroundColor: "#cdd6f4",
              borderColor: "#45475a",
            },
            success: { style: { borderColor: "#a6e3a1" } },
            error: { style: { borderColor: "#f38ba8" } },
          }}
        />
      </DialogProvider>
    </ThemeProvider>
  );
}

const renderer = await createCliRenderer({
  // Enable scroll interaction in scrollbox.
  useMouse: true,
  useAlternateScreen: false,
});

createRoot(renderer).render(<App />);
