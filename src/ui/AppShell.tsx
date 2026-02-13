import type { ProviderClient } from "../adapters/provider/types";
import type { ToolRegistry } from "../adapters/tools/types";
import { useMemo } from "react";
import { useCanSubmit, useErrorSummary } from "../hooks/use-app-state";
import { useIntentController } from "../hooks/use-intent-controller";
import { useShellCommandController } from "../hooks/use-shell-command-controller";
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
  const shell = useShellCommandController({
    providerClient,
    sessionId: state.sessionId,
    submitIntent: submit,
  });
  const slashSuggestions = useMemo(() => {
    const query = state.draft.trim().toLowerCase();
    if (!query.startsWith("/")) {
      return [];
    }
    const options = [
      { command: "/login", description: "interactive login" },
      { command: "/whoami", description: "show current identity" },
      { command: "/logout", description: "clear local token" },
      { command: "/mcp", description: "list MCP servers" },
    ];
    return options.filter((item) => item.command.startsWith(query) || query === "/");
  }, [state.draft]);

  useShortcuts({
    onResetSession: resetSession,
    onClearError: clearError,
  });

  return (
    <box flexDirection="column" width="100%" height="100%" paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
      <box flexShrink={0}>
        <GreetingBanner />
      </box>

      <box flexGrow={1} minHeight={0}>
        <MessagePane viewModel={state.viewModel} surfacePhase={state.surfacePhase} shellLogs={shell.logs} />
      </box>

      <box flexDirection="column" flexShrink={0} gap={0}>
        <InputPane
          draft={state.draft}
          status={state.status}
          surfacePhase={state.surfacePhase}
          canSubmit={canSubmit}
          commandMode
          shellHint={shell.loginHint}
          passwordMode={shell.isPasswordInput}
          slashSuggestions={slashSuggestions}
          onInput={setDraft}
          onSubmit={shell.submitInput}
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
    </box>
  );
}
