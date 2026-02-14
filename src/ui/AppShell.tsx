import { useMemo, useState } from "react";
import { useRenderer } from "@opentui/react";
import type { PlatformApiClient } from "../adapters/platform-api/client";
import { useShellCommandController } from "../hooks/use-shell-command-controller";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { ConfigService } from "../services/config-service";
import { InputPane } from "./InputPane";
import { MessagePane } from "./MessagePane";
import { StatusBar } from "./StatusBar";

interface AppShellProps {
  apiClient: PlatformApiClient;
  configService: ConfigService;
}

export function AppShell({ apiClient, configService }: AppShellProps) {
  const renderer = useRenderer();
  const [draft, setDraft] = useState("");

  const exitShell = () => {
    renderer.destroy();
    setTimeout(() => {
      process.exit(0);
    }, 0);
  };

  const runtimeConfig = configService.getRuntimeConfig();

  const shell = useShellCommandController({
    apiClient,
    onExit: exitShell,
  });

  const slashSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query.startsWith("/")) {
      return [];
    }

    const options = [
      { command: "/login", description: "interactive login" },
      { command: "/mcp", description: "list MCP servers" },
      { command: "/logout", description: "clear local token" },
      { command: "/exit", description: "exit abc-cli shell" },
    ];

    return options.filter((item) => item.command.startsWith(query) || query === "/");
  }, [draft]);

  useShortcuts({
    onExit: exitShell,
    onClearInput: () => setDraft(""),
  });

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      gap={1}
    >
      <box flexGrow={1} minHeight={0}>
        <MessagePane shellLogs={shell.logs} />
      </box>

      <box flexDirection="column" flexShrink={0} gap={0}>
        <InputPane
          draft={draft}
          shellHint={shell.loginHint}
          passwordMode={shell.isPasswordInput}
          slashSuggestions={slashSuggestions}
          onInput={setDraft}
          onSubmit={shell.submitInput}
        />
        <StatusBar
          apiLabel={runtimeConfig.provider}
          authOn={Boolean(shell.authState.token)}
          activeSessionId={shell.activeSessionId}
          streamState={shell.streamState}
        />
      </box>
    </box>
  );
}
