import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import "opentui-spinner/react";
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
      <AppShell apiClient={apiClient} configService={configService} />
    </ThemeProvider>
  );
}

const renderer = await createCliRenderer({
  // Enable scroll interaction in scrollbox.
  useMouse: true,
  useAlternateScreen: false,
});

createRoot(renderer).render(<App />);
