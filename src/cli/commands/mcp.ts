/**
 * MCP command handlers.
 */

import { readFile } from "node:fs/promises";
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
    const payloadFilePath = readStringOption(parsed.options, "payload-file");
    ensureSinglePayloadSource(payloadJsonRaw, payloadFilePath, "mcp add");
    if (payloadJsonRaw !== undefined || payloadFilePath !== undefined) {
      const hasConflict =
        readStringOption(parsed.options, "server-code") !== undefined
        || readStringOption(parsed.options, "url") !== undefined
        || readStringOption(parsed.options, "version") !== undefined
        || readStringOption(parsed.options, "name") !== undefined
        || readStringOption(parsed.options, "description") !== undefined
        || readStringOption(parsed.options, "auth-type") !== undefined
        || readStringOption(parsed.options, "auth-config-json") !== undefined;
      if (hasConflict) {
        throw new Error("mcp add --payload-json/--payload-file cannot be used with other add options.");
      }
      const payload = await parsePayloadInput(payloadJsonRaw, payloadFilePath);
      if (!isRecord(payload)) {
        throw new Error("--payload-json/--payload-file must provide a JSON object.");
      }
      const requiredFields = ["serverCode", "version", "name", "endpoint", "authType", "authConfig"];
      for (const field of requiredFields) {
        if (!(field in payload)) {
          throw new Error(`mcp add payload missing required field '${field}'.`);
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
  // ── Step 1: Check the server's authType ──────────────────────────────
  const serverResp = await ctx.runWithAutoRefresh((t) => ctx.apiClient.getMcp(t, id));
  if (!serverResp.ok || !isRecord(serverResp.body)) {
    throw new Error(`Failed to fetch MCP server info for id=${id}.`);
  }
  const authType = (serverResp.body as Record<string, unknown>).authType as string | undefined;

  // ── Step 2: Build payload from flags ─────────────────────────────────
  const payloadJsonRaw = readStringOption(parsed.options, "payload-json");
  const payloadFilePath = readStringOption(parsed.options, "payload-file");
  ensureSinglePayloadSource(payloadJsonRaw, payloadFilePath, "mcp auth start");
  let payload: {
    connectionName?: string;
    returnUrl?: string;
    credentials?: unknown;
  };

  if (payloadJsonRaw !== undefined || payloadFilePath !== undefined) {
    const hasConflict =
      readStringOption(parsed.options, "connection-name") !== undefined
      || readStringOption(parsed.options, "return-url") !== undefined
      || readStringOption(parsed.options, "credentials-json") !== undefined;
    if (hasConflict) {
      throw new Error("mcp auth start --payload-json/--payload-file cannot be used with other auth start options.");
    }
    const parsedPayload = await parsePayloadInput(payloadJsonRaw, payloadFilePath);
    if (!isRecord(parsedPayload)) {
      throw new Error("--payload-json/--payload-file must provide a JSON object.");
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

  // ── Step 3: OAuth2 flow — browser + polling ──────────────────────────
  if (authType === "OAUTH2") {
    await executeOAuth2BrowserFlow(ctx, id, payload);
    return;
  }

  // ── Step 4: Non-OAuth2 flow — direct credentials ─────────────────────
  const response = await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.startMcpAuth(accessToken, id, payload));
  const success = readBooleanField(response.body, "success");
  if (response.ok && success === true) {
    ctx.logger.appendLog("info", "MCP auth succeeded. Triggering capability sync...");
    await ctx.runWithAutoRefresh((accessToken) => ctx.apiClient.syncMcp(accessToken, id));
  }
}

// ── OAuth2 browser-based auth flow ───────────────────────────────────────
const OAUTH2_POLL_INTERVAL_MS = 3_000;
const OAUTH2_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

async function executeOAuth2BrowserFlow(
  ctx: CommandContext,
  serverId: number,
  payload: { connectionName?: string; returnUrl?: string; credentials?: unknown },
): Promise<void> {
  ctx.logger.appendLog("info", "OAuth2 detected — initiating browser authorization...");

  // 1. POST auth with redirect interception (this one is logged normally)
  const authResp = await ctx.runWithAutoRefresh((t) =>
    ctx.apiClient.startMcpAuthOAuth2(t, serverId, payload),
  );

  const authUrl = authResp.redirectUrl;
  if (!authUrl) {
    // Fallback: maybe the server returned a JSON body with the URL
    const bodyUrl = isRecord(authResp.body)
      ? (authResp.body as Record<string, unknown>).authUrl ?? (authResp.body as Record<string, unknown>).auth_url
      : undefined;
    if (typeof bodyUrl === "string" && bodyUrl.startsWith("http")) {
      await openBrowserUrl(bodyUrl);
      ctx.logger.appendLog("info", `Browser opened → ${bodyUrl}`);
    } else {
      throw new Error(
        `OAuth2 auth did not return a redirect URL (status=${authResp.status}). ` +
        `Body: ${JSON.stringify(authResp.body)}`,
      );
    }
  } else {
    await openBrowserUrl(authUrl);
    ctx.logger.appendLog("info", `Browser opened → ${authUrl}`);
  }

  // 2. Lock input and poll silently until authenticated or timeout
  ctx.setShellHint("oauth2> Waiting for authorization in browser... (timeout: 5 min)");
  const deadline = Date.now() + OAUTH2_TIMEOUT_MS;

  try {
    while (Date.now() < deadline) {
      await sleep(OAUTH2_POLL_INTERVAL_MS);

      const statusResp = await ctx.runSilent((t) =>
        ctx.apiClient.getMcpAuthStatus(t, serverId),
      );

      if (statusResp.ok && isRecord(statusResp.body)) {
        const body = statusResp.body as Record<string, unknown>;
        if (body.authenticated === true) {
          ctx.logger.appendLog("info", `✅ OAuth2 authorization succeeded! (connectionId: ${body.connectionId ?? "N/A"})`);
          ctx.logger.appendLog("info", "Triggering capability sync...");
          await ctx.runWithAutoRefresh((t) => ctx.apiClient.syncMcp(t, serverId));
          return;
        }
      }
    }

    throw new Error("OAuth2 authorization timed out after 5 minutes. Please try again.");
  } finally {
    ctx.setShellHint(null);
  }
}

function openBrowserUrl(url: string): Promise<void> {
  const platform = process.platform;
  let cmd: string;
  let args: string[];

  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", url];
  } else {
    // Linux / others
    cmd = "xdg-open";
    args = [url];
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const proc = Bun.spawn([cmd, ...args], {
        stdout: "ignore",
        stderr: "ignore",
      });
      // Don't wait for browser to close; just ensure spawn succeeded
      proc.unref();
      resolve();
    } catch (err) {
      reject(new Error(`Failed to open browser: ${err instanceof Error ? err.message : String(err)}`));
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureSinglePayloadSource(
  payloadJsonRaw: string | undefined,
  payloadFilePath: string | undefined,
  commandName: string,
): void {
  if (payloadJsonRaw !== undefined && payloadFilePath !== undefined) {
    throw new Error(`${commandName} cannot use --payload-json and --payload-file together.`);
  }
}

async function parsePayloadInput(
  payloadJsonRaw: string | undefined,
  payloadFilePath: string | undefined,
): Promise<unknown> {
  if (payloadFilePath !== undefined) {
    const normalizedPath = payloadFilePath.trim();
    if (normalizedPath === "") {
      throw new Error("--payload-file requires a non-empty file path.");
    }
    let raw: string;
    try {
      raw = await readFile(normalizedPath, "utf8");
    } catch (error) {
      throw new Error(`Failed to read payload file '${normalizedPath}': ${error instanceof Error ? error.message : String(error)}`);
    }
    return parseJsonOption(raw, "--payload-file");
  }

  return parseJsonOption(payloadJsonRaw, "--payload-json");
}
