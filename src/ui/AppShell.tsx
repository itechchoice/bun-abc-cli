import { useMemo, useState } from "react";
import { useRenderer } from "@opentui/react";
import type { PlatformApiClient } from "../adapters/platform-api/client";
import { useShellCommandController } from "../hooks/use-shell-command-controller";
import { useShortcuts } from "../hooks/use-shortcuts";
import type { ConfigService } from "../services/config-service";
import { InputPane } from "./InputPane";
import { MessagePane } from "./MessagePane";
import { StatusBar } from "./StatusBar";
import {
  browseCommandHistoryNext,
  browseCommandHistoryPrev,
  createCommandHistoryState,
  pushCommandHistory,
} from "./command-history";
import { useTheme } from "../theme/context";

interface AppShellProps {
  apiClient: PlatformApiClient;
  configService: ConfigService;
}

export function AppShell({ apiClient, configService }: AppShellProps) {
  const renderer = useRenderer();
  const [draft, setDraft] = useState("");
  const [historyState, setHistoryState] = useState(createCommandHistoryState);

  const exitShell = () => {
    renderer.destroy();
    setTimeout(() => {
      process.exit(0);
    }, 0);
  };

  const runtimeConfig = configService.getRuntimeConfig();
  const { themeName, palette, setThemeName, themeWarning } = useTheme();

  const shell = useShellCommandController({
    apiClient,
    themeName,
    themeWarning,
    setThemeName,
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
      { command: "/theme", description: "open theme picker" },
      { command: "/logout", description: "clear local token" },
      { command: "/exit", description: "exit abc-cli shell" },
    ];

    return options.filter((item) => item.command.startsWith(query) || query === "/");
  }, [draft]);

  useShortcuts({
    onExit: exitShell,
    onClearInput: () => setDraft(""),
  });

  const handleHistoryPrev = () => {
    const result = browseCommandHistoryPrev(historyState, draft);
    setHistoryState(result.state);
    return result.nextDraft;
  };

  const handleHistoryNext = () => {
    const result = browseCommandHistoryNext(historyState);
    setHistoryState(result.state);
    return result.nextDraft;
  };

  const handleSubmit = async (value?: string) => {
    const raw = value ?? draft;
    const trimmed = raw.trim();
    await shell.submitInput(raw);
    if (trimmed !== "") {
      setHistoryState((prev) => pushCommandHistory(prev, trimmed));
    } else {
      setHistoryState((prev) => ({
        ...prev,
        index: null,
        draftBeforeBrowse: "",
      }));
    }
  };

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
      backgroundColor={palette.surfaceBg}
    >
      <box flexGrow={1} minHeight={0}>
        <MessagePane shellLogs={shell.logs} palette={palette} themeName={themeName} />
      </box>

      <box flexDirection="column" flexShrink={0} gap={0}>
        <InputPane
          draft={draft}
          palette={palette}
          shellHint={shell.loginHint}
          passwordMode={shell.isPasswordInput}
          activeThemeName={themeName}
          themePickerOpen={shell.isThemePickerOpen}
          themeOptions={[
            { name: "dark", description: "dark terminal palette" },
            { name: "light-hc", description: "light high-contrast palette" },
          ]}
          slashSuggestions={slashSuggestions}
          onHistoryPrev={handleHistoryPrev}
          onHistoryNext={handleHistoryNext}
          onThemeSelect={shell.applyThemeFromPicker}
          onThemePickerClose={shell.closeThemePicker}
          onInput={setDraft}
          onSubmit={handleSubmit}
        />
        <StatusBar
          apiLabel={runtimeConfig.provider}
          themeName={themeName}
          palette={palette}
          authOn={Boolean(shell.authState.token)}
          activeSessionId={shell.activeSessionId}
          streamState={shell.streamState}
          historyCount={historyState.entries.length}
          activeCommandLabel={shell.activeCommandLabel}
        />
      </box>
    </box>
  );
}
