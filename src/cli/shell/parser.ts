import { parseArgsStringToArgv } from "string-argv";
import yargsParser from "yargs-parser";
import type { ParsedShellInput } from "./types";

function toOptionRecord(input: ReturnType<typeof yargsParser>): Record<string, string | boolean | string[]> {
  const entries = Object.entries(input).filter(([key]) => key !== "_" && key !== "$0");
  return Object.fromEntries(entries) as Record<string, string | boolean | string[]>;
}

function tokenize(raw: string): string[] {
  return parseArgsStringToArgv(raw);
}

function parseManualCommand(raw: string): ParsedShellInput {
  const tokens = tokenize(raw.trim());
  const group = tokens[0];
  if (group !== "mcp" && group !== "run") {
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
  const restPositionals = positionals.slice(1);
  const options = toOptionRecord(parsed);

  if (group === "mcp" && (command === "add" || command === "list" || command === "get")) {
    return {
      kind: "command",
      raw,
      group: "mcp",
      command,
      positionals: restPositionals,
      options,
    };
  }

  if (
    group === "run"
    && (command === "submit" || command === "status" || command === "events" || command === "artifacts" || command === "result")
  ) {
    return {
      kind: "command",
      raw,
      group: "run",
      command,
      positionals: restPositionals,
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
    const name = trimmed.slice(1).trim().split(/\s+/)[0];
    if (name === "login" || name === "logout" || name === "whoami" || name === "mcp" || name === "exit") {
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
