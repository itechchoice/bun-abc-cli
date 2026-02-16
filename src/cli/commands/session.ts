/**
 * Session command handlers.
 */

import { readStringOption } from "../shell/parser";
import type { ParsedCommandInput } from "../shell/types";
import { parsePositiveInt, readTaskSessionId, resolveNumericId } from "../../utils/json-helpers";
import type { CommandContext } from "./types";

export async function executeSessionCommand(ctx: CommandContext, parsed: ParsedCommandInput): Promise<void> {
  if (parsed.command === "create") {
    const response = await ctx.runWithAutoRefresh((accessToken) =>
      ctx.apiClient.createSession(accessToken, readStringOption(parsed.options, "title")),
    );
    if (response.ok) {
      const sessionId = readTaskSessionId(response.body);
      if (sessionId !== null) {
        ctx.setActiveSessionId(sessionId);
        ctx.logger.appendLog("success", `Switched to session ${sessionId}.`);
      }
    }
    return;
  }

  if (parsed.command === "list") {
    const pageRaw = readStringOption(parsed.options, "page");
    const sizeRaw = readStringOption(parsed.options, "size");
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.listSessions(accessToken, {
      status: readStringOption(parsed.options, "status"),
      page: pageRaw ? parsePositiveInt(pageRaw, "page") : undefined,
      size: sizeRaw ? parsePositiveInt(sizeRaw, "size") : undefined,
    }));
    return;
  }

  if (parsed.command === "get") {
    const sessionId = resolveNumericId("sessionId", parsed.positionals, parsed.options, "session-id");
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getSession(accessToken, sessionId));
    return;
  }

  if (parsed.command === "use") {
    const sessionId = resolveNumericId("sessionId", parsed.positionals, parsed.options, "session-id");
    const response = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getSession(accessToken, sessionId));
    if (response.ok) {
      ctx.setActiveSessionId(sessionId);
      ctx.logger.appendLog("success", `Active session set to ${sessionId}.`);
    }
    return;
  }

  if (parsed.command === "current") {
    if (ctx.activeSessionId === null) {
      ctx.logger.appendLog("info", "No active session. Use `session create` or `session use <id>`.");
      return;
    }
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getSession(accessToken, ctx.activeSessionId!));
    return;
  }

  if (parsed.command === "leave") {
    ctx.setActiveSessionId(null);
    ctx.logger.appendLog("success", "Left current session.");
    return;
  }

  throw new Error("Unsupported session command.");
}
