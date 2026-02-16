import { parseArgsStringToArgv } from "string-argv";
import yargsParser from "yargs-parser";
import type { ParsedShellInput, SlashCommandName } from "./types";

const SLASH_COMMANDS: ReadonlySet<SlashCommandName> = new Set(["login", "logout", "mcp", "sessions", "theme", "exit"]);

function toOptionRecord(input: ReturnType<typeof yargsParser>): Record<string, string | boolean | string[]> {
  const entries = Object.entries(input).filter(([key]) => key !== "_" && key !== "$0");
  return Object.fromEntries(entries) as Record<string, string | boolean | string[]>;
}

function tokenize(raw: string): string[] {
  return parseArgsStringToArgv(raw);
}

function parseManualCommand(raw: string): ParsedShellInput {
  const tokens = tokenize(raw.trim());
  if (tokens.length === 0) {
    return { kind: "text", raw };
  }

  const group = tokens[0];
  if (group !== "auth" && group !== "mcp" && group !== "session" && group !== "run" && group !== "theme") {
    return { kind: "text", raw };
  }

  const parsed = yargsParser(tokens.slice(1), {
    configuration: {
      "camel-case-expansion": false,
      "dot-notation": false,
      "parse-numbers": false,
      "parse-positional-numbers": false,
      "duplicate-arguments-array": true,
      "short-option-groups": false,
    },
  });

  const positionals = parsed._.map((item: unknown) => String(item));
  const command = positionals[0];
  const options = toOptionRecord(parsed);

  if (!command) {
    return { kind: "text", raw };
  }

  if (group === "auth") {
    if (command === "refresh") {
      return {
        kind: "command",
        raw,
        group,
        command,
        positionals: positionals.slice(1),
        options,
      };
    }
    return { kind: "text", raw };
  }

  if (group === "mcp") {
    if (command === "add" || command === "list" || command === "get" || command === "update" || command === "delete" || command === "sync" || command === "capabilities") {
      return {
        kind: "command",
        raw,
        group,
        command,
        positionals: positionals.slice(1),
        options,
      };
    }

    if (command === "auth") {
      const subcommand = positionals[1];
      if (subcommand === "start" || subcommand === "status" || subcommand === "delete") {
        return {
          kind: "command",
          raw,
          group,
          command,
          subcommand,
          positionals: positionals.slice(2),
          options,
        };
      }
    }

    return { kind: "text", raw };
  }

  if (group === "session") {
    if (command === "create" || command === "list" || command === "get" || command === "use" || command === "current" || command === "leave") {
      return {
        kind: "command",
        raw,
        group,
        command,
        positionals: positionals.slice(1),
        options,
      };
    }
    return { kind: "text", raw };
  }

  if (group === "theme") {
    if (command === "list" || command === "current" || command === "set") {
      return {
        kind: "command",
        raw,
        group,
        command,
        positionals: positionals.slice(1),
        options,
      };
    }
    return { kind: "text", raw };
  }

  if (command === "submit" || command === "status" || command === "events" || command === "cancel" || command === "list") {
    return {
      kind: "command",
      raw,
      group,
      command,
      positionals: positionals.slice(1),
      options,
    };
  }

  return { kind: "text", raw };
}

export function parseShellInput(raw: string): ParsedShellInput {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { kind: "text", raw: "" };
  }

  if (trimmed.startsWith("/")) {
    const name = trimmed.slice(1).trim().split(/\s+/)[0] as SlashCommandName;
    if (SLASH_COMMANDS.has(name)) {
      return { kind: "slash", raw, name };
    }
    return { kind: "text", raw };
  }

  return parseManualCommand(raw);
}

export function readStringOption(
  options: Record<string, string | boolean | string[]>,
  name: string,
): string | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return typeof last === "string" ? last : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

export function readStringArrayOption(
  options: Record<string, string | boolean | string[]>,
  name: string,
): string[] {
  const value = options[name];
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}
