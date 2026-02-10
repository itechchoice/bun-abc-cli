import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { MockProviderClient } from "./adapters/provider/mock-provider";
import { MockToolRegistry } from "./adapters/tools/mock-tools";
import { createMemoryConfigService } from "./services/memory-config-service";
import { createMemorySessionService } from "./services/memory-session-service";
import { AppStateProvider } from "./state/context";
import { AppShell } from "./ui/AppShell";

const sessionService = createMemorySessionService();
const configService = createMemoryConfigService();
const providerClient = new MockProviderClient();
const toolRegistry = new MockToolRegistry();

function App() {
  return (
    <AppStateProvider sessionService={sessionService}>
      <AppShell
        providerClient={providerClient}
        toolRegistry={toolRegistry}
        configService={configService}
        sessionService={sessionService}
      />
    </AppStateProvider>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
