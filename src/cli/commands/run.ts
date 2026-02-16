/**
 * Run command handlers.
 */

import { readStringOption } from "../shell/parser";
import type { ParsedCommandInput } from "../shell/types";
import {
  parseFollowOption,
  parsePositiveInt,
  readTaskSessionId,
  readTaskStatus,
  isTerminalTaskStatus,
  resolveTaskId,
} from "../../utils/json-helpers";
import type { CommandContext } from "./types";

function ensureActiveSession(ctx: CommandContext, commandName: string): number {
  if (ctx.activeSessionId === null) {
    throw new Error(`run ${commandName} requires an active session. Use \`session use <id>\` or \`session create\` first.`);
  }
  return ctx.activeSessionId;
}

function assertTaskBelongsToActiveSession(taskBody: unknown, commandName: string, expectedSessionId: number): void {
  const taskSessionId = readTaskSessionId(taskBody);
  if (taskSessionId === null) {
    throw new Error(`run ${commandName} response missing sessionId.`);
  }
  if (taskSessionId !== expectedSessionId) {
    throw new Error(
      `Task belongs to session ${taskSessionId}, but active session is ${expectedSessionId}. Run \`session use ${taskSessionId}\` first.`,
    );
  }
}

export async function executeRunCommand(ctx: CommandContext, parsed: ParsedCommandInput): Promise<void> {
  if (parsed.command === "submit") {
    const expectedSessionId = ensureActiveSession(ctx, "submit");
    const objective = readStringOption(parsed.options, "objective");
    if (!objective || objective.trim() === "") {
      throw new Error("run submit requires --objective <text>.");
    }

    const sessionIdRaw = readStringOption(parsed.options, "session-id");
    const requestedSessionId = sessionIdRaw ? parsePositiveInt(sessionIdRaw, "sessionId") : expectedSessionId;
    if (requestedSessionId !== expectedSessionId) {
      throw new Error(
        `run submit must use active session ${expectedSessionId}. Run \`session use ${requestedSessionId}\` first.`,
      );
    }

    const response = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.createTask(accessToken, {
      message: objective,
      sessionId: requestedSessionId,
    }));
    if (response.ok) {
      assertTaskBelongsToActiveSession(response.body, "submit", expectedSessionId);
      ctx.setActiveSessionId(readTaskSessionId(response.body) ?? expectedSessionId);
    }
    return;
  }

  if (parsed.command === "status") {
    const expectedSessionId = ensureActiveSession(ctx, "status");
    const taskId = resolveTaskId("status", parsed.positionals, parsed.options);
    const response = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getTask(accessToken, taskId));
    if (response.ok) {
      assertTaskBelongsToActiveSession(response.body, "status", expectedSessionId);
    }
    return;
  }

  if (parsed.command === "events") {
    const expectedSessionId = ensureActiveSession(ctx, "events");
    const { follow, impliedTaskId } = parseFollowOption(parsed.options);
    if (!follow) {
      throw new Error("run events requires --follow <task_id>.");
    }
    const taskId = resolveTaskId("events", parsed.positionals, parsed.options, impliedTaskId);
    const probe = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getTask(accessToken, taskId));
    if (!probe.ok) {
      return;
    }
    assertTaskBelongsToActiveSession(probe.body, "events", expectedSessionId);
    await ctx.startFollow(taskId, expectedSessionId);
    return;
  }

  if (parsed.command === "list") {
    ensureActiveSession(ctx, "list");
    const pageRaw = readStringOption(parsed.options, "page");
    const sizeRaw = readStringOption(parsed.options, "size");
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.listTasks(accessToken, {
      status: readStringOption(parsed.options, "status"),
      page: pageRaw ? parsePositiveInt(pageRaw, "page") : undefined,
      size: sizeRaw ? parsePositiveInt(sizeRaw, "size") : undefined,
    }));
    return;
  }

  if (parsed.command === "cancel") {
    const expectedSessionId = ensureActiveSession(ctx, "cancel");
    const taskId = resolveTaskId("cancel", parsed.positionals, parsed.options);
    const probe = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getTask(accessToken, taskId));
    if (!probe.ok) {
      return;
    }
    assertTaskBelongsToActiveSession(probe.body, "cancel", expectedSessionId);
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.cancelTask(accessToken, taskId));
    return;
  }

  throw new Error("Unsupported run command.");
}
