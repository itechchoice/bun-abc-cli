import type { ProviderClient } from "../adapters/provider/types";
import type { ToolRegistry } from "../adapters/tools/types";
import { useCanSubmit, useErrorSummary } from "../hooks/use-app-state";
import { useIntentController } from "../hooks/use-intent-controller";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { ConfigService } from "../services/config-service";
import type { SessionService } from "../services/session-service";
import { GreetingBanner } from "./GreetingBanner";
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

  const { state, setDraft, submit, clearError, resetSession } = useIntentController({
    providerClient,
    sessionService,
  });

  useShortcuts({
    onResetSession: resetSession,
    onClearError: clearError,
  });

  return (
    <box flexDirection="column" width="100%" height="100%" paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
      <GreetingBanner />
      <MessagePane viewModel={state.viewModel} surfacePhase={state.surfacePhase} />
      <InputPane
        draft={state.draft}
        status={state.status}
        surfacePhase={state.surfacePhase}
        canSubmit={canSubmit}
        onInput={setDraft}
        onSubmit={submit}
      />
      <StatusBar
        status={state.status}
        surfacePhase={state.surfacePhase}
        sessionId={state.sessionId}
        providerName={runtimeConfig.provider}
        toolsLabel={toolRegistry.label}
        activeExecutionId={state.activeExecutionId}
        errorSummary={errorSummary}
        reconnecting={state.viewModel.reconnecting}
      />
    </box>
  );
}
