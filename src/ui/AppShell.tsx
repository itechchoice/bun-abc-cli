import type { ProviderClient } from "../adapters/provider/types";
import type { ToolRegistry } from "../adapters/tools/types";
import { useCanSubmit, useErrorSummary } from "../hooks/use-app-state";
import { useChatController } from "../hooks/use-chat-controller";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { ConfigService } from "../services/config-service";
import type { SessionService } from "../services/session-service";
import { Header } from "./Header";
import { InputPane } from "./InputPane";
import { MessagePane } from "./MessagePane";
import { StatusBar } from "./StatusBar";

interface AppShellProps {
  providerClient: ProviderClient;
  toolRegistry: ToolRegistry;
  configService: ConfigService;
  sessionService: SessionService;
}

export function AppShell({ providerClient, toolRegistry, configService, sessionService }: AppShellProps) {
  const runtimeConfig = configService.getRuntimeConfig();
  const canSubmit = useCanSubmit();
  const errorSummary = useErrorSummary();

  const { state, setDraft, submit, clearError, resetSession } = useChatController({
    providerClient,
    sessionService,
  });

  useShortcuts({
    onResetSession: resetSession,
    onClearError: clearError,
  });

  return (
    <box flexDirection="column" width="100%" height="100%" padding={1} gap={1}>
      <Header />
      <MessagePane messages={state.messages} />
      <InputPane draft={state.draft} status={state.status} canSubmit={canSubmit} onInput={setDraft} onSubmit={submit} />
      <StatusBar
        status={state.status}
        sessionId={state.sessionId}
        providerName={runtimeConfig.provider}
        toolsLabel={toolRegistry.label}
        errorSummary={errorSummary}
      />
    </box>
  );
}
