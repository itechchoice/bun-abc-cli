/**
 * MCP command handlers.
 */

import type { McpAuthType } from "../../adapters/platform-api/types";
import { AUTH_TYPES } from "../../constants";
import { readStringOption } from "../shell/parser";
import type { ParsedCommandInput } from "../shell/types";
import {
  isRecord,
  parseJsonOption,
  parsePositiveInt,
  readBooleanField,
  resolveNumericId,
} from "../../utils/json-helpers";
import type { CommandContext } from "./types";

export async function executeMcpCommand(ctx: CommandContext, parsed: ParsedCommandInput): Promise<void> {
  if (parsed.command === "add") {
    const payloadJsonRaw = readStringOption(parsed.options, "payload-json");
    if (payloadJsonRaw !== undefined) {
      const hasConflict =
        readStringOption(parsed.options, "server-code") !== undefined
        || readStringOption(parsed.options, "url") !== undefined
        || readStringOption(parsed.options, "version") !== undefined
        || readStringOption(parsed.options, "name") !== undefined
        || readStringOption(parsed.options, "description") !== undefined
        || readStringOption(parsed.options, "auth-type") !== undefined
        || readStringOption(parsed.options, "auth-config-json") !== undefined;
      if (hasConflict) {
        throw new Error("mcp add --payload-json cannot be used with other add options.");
      }
      const payload = parseJsonOption(payloadJsonRaw, "--payload-json");
      if (!isRecord(payload)) {
        throw new Error("--payload-json must be a JSON object.");
      }
      const requiredFields = ["serverCode", "version", "name", "endpoint", "authType", "authConfig"];
      for (const field of requiredFields) {
        if (!(field in payload)) {
          throw new Error(`mcp add --payload-json missing required field '${field}'.`);
        }
      }
      await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.createMcp(accessToken, payload as Record<string, unknown> as {
        serverCode: string;
        version: string;
        name: string;
        endpoint: string;
        authType: McpAuthType;
        authConfig: unknown;
        description?: string;
      }));
      return;
    }

    const serverCode = readStringOption(parsed.options, "server-code");
    const endpoint = readStringOption(parsed.options, "url");
    const version = readStringOption(parsed.options, "version");
    if (!serverCode || !endpoint || !version) {
      throw new Error("mcp add requires --server-code <code> --url <endpoint> --version <v>.");
    }

    const authTypeRaw = (readStringOption(parsed.options, "auth-type") ?? "NONE").toUpperCase();
    if (!AUTH_TYPES.has(authTypeRaw)) {
      throw new Error("mcp add --auth-type must be one of NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM.");
    }

    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.createMcp(accessToken, {
      serverCode,
      version,
      name: readStringOption(parsed.options, "name") ?? serverCode,
      description: readStringOption(parsed.options, "description"),
      endpoint,
      authType: authTypeRaw as McpAuthType,
      authConfig: parseJsonOption(readStringOption(parsed.options, "auth-config-json"), "--auth-config-json") ?? {},
    }));
    return;
  }

  if (parsed.command === "list") {
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.listMcp(accessToken, {
      serverCode: readStringOption(parsed.options, "server-code"),
      status: readStringOption(parsed.options, "status"),
    }));
    return;
  }

  if (parsed.command === "get") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getMcp(accessToken, id));
    return;
  }

  if (parsed.command === "update") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    const payload: Record<string, unknown> = {};

    const name = readStringOption(parsed.options, "name");
    const description = readStringOption(parsed.options, "description");
    const mcpEndpoint = readStringOption(parsed.options, "url");
    const authType = readStringOption(parsed.options, "auth-type");
    const authConfigJson = readStringOption(parsed.options, "auth-config-json");

    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (mcpEndpoint !== undefined) payload.endpoint = mcpEndpoint;
    if (authType !== undefined) {
      const normalized = authType.toUpperCase();
      if (!AUTH_TYPES.has(normalized)) {
        throw new Error("mcp update --auth-type must be one of NONE|API_KEY|BASIC|OAUTH2|JWT|CUSTOM.");
      }
      payload.authType = normalized;
    }
    if (authConfigJson !== undefined) {
      payload.authConfig = parseJsonOption(authConfigJson, "--auth-config-json");
    }

    if (Object.keys(payload).length === 0) {
      throw new Error("mcp update requires at least one field to update.");
    }

    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.updateMcp(accessToken, id, payload));
    return;
  }

  if (parsed.command === "delete") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.deleteMcp(accessToken, id));
    return;
  }

  if (parsed.command === "sync") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.syncMcp(accessToken, id));
    return;
  }

  if (parsed.command === "capabilities") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.listCapabilities(accessToken, id));
    return;
  }

  if (parsed.command === "auth") {
    const id = resolveNumericId("mcp id", parsed.positionals, parsed.options);
    if (parsed.subcommand === "start") {
      await executeMcpAuthStart(ctx, parsed, id);
      return;
    }

    if (parsed.subcommand === "status") {
      await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.getMcpAuthStatus(accessToken, id));
      return;
    }

    if (parsed.subcommand === "delete") {
      const connectionIdRaw = readStringOption(parsed.options, "connection-id");
      const connectionId = connectionIdRaw ? parsePositiveInt(connectionIdRaw, "connectionId") : undefined;
      await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.deleteMcpAuth(accessToken, id, connectionId));
      return;
    }
  }

  throw new Error("Unsupported mcp command.");
}

async function executeMcpAuthStart(ctx: CommandContext, parsed: ParsedCommandInput, id: number): Promise<void> {
  const payloadJsonRaw = readStringOption(parsed.options, "payload-json");
  let payload: {
    connectionName?: string;
    returnUrl?: string;
    credentials?: unknown;
  };

  if (payloadJsonRaw !== undefined) {
    const hasConflict =
      readStringOption(parsed.options, "connection-name") !== undefined
      || readStringOption(parsed.options, "return-url") !== undefined
      || readStringOption(parsed.options, "credentials-json") !== undefined;
    if (hasConflict) {
      throw new Error("mcp auth start --payload-json cannot be used with other auth start options.");
    }
    const parsedPayload = parseJsonOption(payloadJsonRaw, "--payload-json");
    if (!isRecord(parsedPayload)) {
      throw new Error("--payload-json must be a JSON object.");
    }
    payload = parsedPayload as {
      connectionName?: string;
      returnUrl?: string;
      credentials?: unknown;
    };
  } else {
    payload = {
      connectionName: readStringOption(parsed.options, "connection-name"),
      returnUrl: readStringOption(parsed.options, "return-url"),
      credentials: parseJsonOption(readStringOption(parsed.options, "credentials-json"), "--credentials-json"),
    };
  }

  const response = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.startMcpAuth(accessToken, id, payload));
  const success = readBooleanField(response.body, "success");
  if (response.ok && success === true) {
    ctx.logger.appendLog("info", "MCP auth succeeded. Triggering capability sync...");
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.syncMcp(accessToken, id));
  }
}
