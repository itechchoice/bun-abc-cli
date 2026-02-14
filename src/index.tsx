import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { PlatformApiClient } from "./adapters/platform-api/client";
import { createMemoryConfigService } from "./services/memory-config-service";
import { AppShell } from "./ui/AppShell";

const configService = createMemoryConfigService();
const runtimeConfig = configService.getRuntimeConfig();
const apiClient = new PlatformApiClient(runtimeConfig.apiBaseUrl);

function App() {
  return <AppShell apiClient={apiClient} configService={configService} />;
}

const renderer = await createCliRenderer({
  // Enable scroll interaction in scrollbox.
  useMouse: true,
  useAlternateScreen: false,
});

createRoot(renderer).render(<App />);
