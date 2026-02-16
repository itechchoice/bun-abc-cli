export type ShellLogLevel = "command" | "info" | "success" | "error";

export interface ShellLogEntry {
  id: string;
  ts: number;
  level: ShellLogLevel;
  text: string;
}

export interface AuthSessionState {
  accessToken: string | null;
  refreshToken: string | null;
  username: string | null;
  loginAt: number | null;
}

export type LoginStep = "idle" | "await_username" | "await_password";

export type SlashCommandName = "login" | "logout" | "mcp" | "sessions" | "theme" | "exit";

export interface ParsedCommandInput {
  kind: "command";
  raw: string;
  group: "auth" | "mcp" | "session" | "run" | "theme";
  command: string;
  subcommand?: string;
  positionals: string[];
  options: Record<string, string | boolean | string[]>;
}

export type ParsedShellInput =
  | {
    kind: "text";
    raw: string;
  }
  | {
    kind: "slash";
    raw: string;
    name: SlashCommandName;
  }
  | ParsedCommandInput;
