import { describe, expect, test } from "bun:test";
import { parseShellInput, readStringOption } from "./parser";

describe("parseShellInput", () => {
  test("parses supported slash command", () => {
    const parsed = parseShellInput("/login");
    expect(parsed.kind).toBe("slash");
    if (parsed.kind === "slash") {
      expect(parsed.name).toBe("login");
    }
  });

  test("parses /theme slash command", () => {
    const parsed = parseShellInput("/theme");
    expect(parsed.kind).toBe("slash");
    if (parsed.kind === "slash") {
      expect(parsed.name).toBe("theme");
    }
  });

  test("parses /sessions slash command", () => {
    const parsed = parseShellInput("/sessions");
    expect(parsed.kind).toBe("slash");
    if (parsed.kind === "slash") {
      expect(parsed.name).toBe("sessions");
    }
  });

  test("rejects removed slash command /whoami", () => {
    const parsed = parseShellInput("/whoami");
    expect(parsed.kind).toBe("text");
  });

  test("parses mcp auth start", () => {
    const parsed = parseShellInput("mcp auth start --id 12 --return-url https://example.com");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("mcp");
      expect(parsed.command).toBe("auth");
      expect(parsed.subcommand).toBe("start");
      expect(readStringOption(parsed.options, "id")).toBe("12");
    }
  });

  test("parses session list", () => {
    const parsed = parseShellInput("session list --page 1 --size 20");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("session");
      expect(parsed.command).toBe("list");
      expect(readStringOption(parsed.options, "page")).toBe("1");
    }
  });

  test("parses auth refresh", () => {
    const parsed = parseShellInput("auth refresh");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("auth");
      expect(parsed.command).toBe("refresh");
    }
  });

  test("parses run list", () => {
    const parsed = parseShellInput("run list --status RUNNING --page 1 --size 20");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("run");
      expect(parsed.command).toBe("list");
      expect(readStringOption(parsed.options, "status")).toBe("RUNNING");
    }
  });

  test("parses session use/current/leave", () => {
    const useParsed = parseShellInput("session use 10001");
    const currentParsed = parseShellInput("session current");
    const leaveParsed = parseShellInput("session leave");

    expect(useParsed.kind).toBe("command");
    expect(currentParsed.kind).toBe("command");
    expect(leaveParsed.kind).toBe("command");
    if (useParsed.kind === "command") {
      expect(useParsed.command).toBe("use");
    }
    if (currentParsed.kind === "command") {
      expect(currentParsed.command).toBe("current");
    }
    if (leaveParsed.kind === "command") {
      expect(leaveParsed.command).toBe("leave");
    }
  });

  test("parses mcp payload-json mode", () => {
    const parsed = parseShellInput("mcp add --payload-json '{\"serverCode\":\"x\"}'");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("mcp");
      expect(parsed.command).toBe("add");
      expect(readStringOption(parsed.options, "payload-json")).toBe("{\"serverCode\":\"x\"}");
    }
  });

  test("parses run cancel", () => {
    const parsed = parseShellInput("run cancel 2001");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("run");
      expect(parsed.command).toBe("cancel");
      expect(parsed.positionals[0]).toBe("2001");
    }
  });

  test("rejects removed run artifacts command", () => {
    const parsed = parseShellInput("run artifacts 2001");
    expect(parsed.kind).toBe("text");
  });

  test("parses theme list", () => {
    const parsed = parseShellInput("theme list");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("theme");
      expect(parsed.command).toBe("list");
    }
  });

  test("parses theme set positional", () => {
    const parsed = parseShellInput("theme set light-hc");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("theme");
      expect(parsed.command).toBe("set");
      expect(parsed.positionals[0]).toBe("light-hc");
    }
  });

  test("parses theme set option", () => {
    const parsed = parseShellInput("theme set --name dark");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("theme");
      expect(parsed.command).toBe("set");
      expect(readStringOption(parsed.options, "name")).toBe("dark");
    }
  });

  test("returns text for non-command input", () => {
    const parsed = parseShellInput("hello world");
    expect(parsed.kind).toBe("text");
  });
});
