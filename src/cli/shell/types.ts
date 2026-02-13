export type ShellLogLevel = "command" | "info" | "success" | "error";

export interface ShellLogEntry {
  id: string;
  ts: number;
  level: ShellLogLevel;
  text: string;
}

export interface AuthSessionState {
  token: string | null;
  username: string | null;
  loginAt: number | null;
}

export interface McpServerState {
  serverCode: string;
  url: string;
  version: string;
  updatedAt: number;
}

export type LoginStep = "idle" | "await_username" | "await_password";

export type ParsedShellInput =
  | {
    kind: "text";
    raw: string;
  }
  | {
    kind: "slash";
    raw: string;
    name: "login" | "logout" | "whoami" | "mcp" | "exit";
  }
  | {
    kind: "command";
    raw: string;
    group: "mcp";
    command: "add" | "list" | "get";
    positionals: string[];
    options: Record<string, string | boolean | string[]>;
  }
  | {
    kind: "command";
    raw: string;
    group: "run";
    command: "submit" | "status" | "events" | "artifacts" | "result";
    positionals: string[];
    options: Record<string, string | boolean | string[]>;
  };
