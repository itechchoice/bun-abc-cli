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

  test("parses run cancel", () => {
    const parsed = parseShellInput("run cancel 2001");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("run");
      expect(parsed.command).toBe("cancel");
      expect(parsed.positionals[0]).toBe("2001");
    }
  });

  test("returns text for non-command input", () => {
    const parsed = parseShellInput("hello world");
    expect(parsed.kind).toBe("text");
  });
});
