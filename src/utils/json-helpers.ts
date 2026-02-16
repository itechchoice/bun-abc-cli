/**
 * Generic utilities for working with JSON-like unknown values,
 * parsing CLI options, and resolving numeric IDs.
 */

import { RETRIABLE_HTTP_STATUSES, TERMINAL_TASK_STATUSES } from "../constants";
import { readStringOption } from "../cli/shell/parser";

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object";
}

// ---------------------------------------------------------------------------
// Field readers (safe access into unknown objects)
// ---------------------------------------------------------------------------

export function readStringField(input: unknown, key: string): string | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "string" ? value : null;
}

export function readNumberField(input: unknown, key: string): number | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readBooleanField(input: unknown, key: string): boolean | null {
  if (!isRecord(input)) {
    return null;
  }
  const value = input[key];
  return typeof value === "boolean" ? value : null;
}

export function readNumberFieldByKeys(input: unknown, keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumberField(input, key);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Convenience readers for task / session responses
// ---------------------------------------------------------------------------

export function readTaskStatus(input: unknown): string | null {
  return readStringField(input, "status");
}

export function readTaskSessionId(input: unknown): number | null {
  return readNumberFieldByKeys(input, ["sessionId", "session_id"]);
}

export function isTerminalTaskStatus(status: string | null): boolean {
  return status !== null && TERMINAL_TASK_STATUSES.has(status.toUpperCase());
}

// ---------------------------------------------------------------------------
// CLI option parsing helpers
// ---------------------------------------------------------------------------

export function parseJsonOption(value: string | undefined, optionName: string): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${optionName} must be valid JSON.`);
  }
}

export function parsePositiveInt(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

export function resolveNumericId(
  label: string,
  positionals: string[],
  options: Record<string, string | boolean | string[]>,
  optionName = "id",
): number {
  if (positionals.length > 1) {
    throw new Error(`${label} accepts at most one positional id.`);
  }

  const positionalRaw = positionals[0]?.trim() || null;
  const optionRaw = readStringOption(options, optionName)?.trim() || null;

  if (positionalRaw && optionRaw && positionalRaw !== optionRaw) {
    throw new Error(`Conflicting ${label} values between positional and --${optionName}.`);
  }

  const raw = optionRaw ?? positionalRaw;
  if (!raw) {
    throw new Error(`${label} is required.`);
  }

  return parsePositiveInt(raw, label);
}

export function resolveTaskId(
  commandName: string,
  positionals: string[],
  options: Record<string, string | boolean | string[]>,
  impliedTaskId: string | null = null,
): number {
  if (positionals.length > 1) {
    throw new Error(`run ${commandName} accepts at most one positional task id.`);
  }

  const positionalRaw = positionals[0]?.trim() || null;
  const optionRaw = readStringOption(options, "task-id")?.trim() || null;

  const values = [positionalRaw, optionRaw, impliedTaskId].filter((value): value is string => Boolean(value));
  const unique = new Set(values);
  if (unique.size > 1) {
    throw new Error(`Conflicting task id values for run ${commandName}.`);
  }

  const raw = values[0];
  if (!raw) {
    throw new Error(`run ${commandName} requires <task_id> or --task-id <id>.`);
  }

  return parsePositiveInt(raw, "task_id");
}

export function parseFollowOption(options: Record<string, string | boolean | string[]>): { follow: boolean; impliedTaskId: string | null } {
  const followRaw = options.follow;
  if (followRaw === undefined) {
    return { follow: false, impliedTaskId: null };
  }

  const values = Array.isArray(followRaw) ? followRaw : [followRaw];
  let follow = false;
  let impliedTaskId: string | null = null;

  for (const value of values) {
    if (value === true) {
      follow = true;
      continue;
    }

    if (typeof value === "string") {
      follow = true;
      const taskId = value.trim();
      if (impliedTaskId && impliedTaskId !== taskId) {
        throw new Error("Conflicting task id values in --follow.");
      }
      impliedTaskId = taskId;
      continue;
    }

    throw new Error("Invalid --follow option value.");
  }

  return { follow, impliedTaskId };
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

export function readJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

export function isRetriableHttpStatus(status: number): boolean {
  return status >= 500 || RETRIABLE_HTTP_STATUSES.has(status);
}

// ---------------------------------------------------------------------------
// Misc utilities
// ---------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
}
