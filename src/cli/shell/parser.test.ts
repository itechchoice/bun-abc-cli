import { describe, expect, test } from "bun:test";
import { parseShellInput, readStringOption } from "./parser";

describe("parseShellInput", () => {
  test("parses slash command", () => {
    const parsed = parseShellInput("/login");
    expect(parsed.kind).toBe("slash");
    if (parsed.kind === "slash") {
      expect(parsed.name).toBe("login");
    }
  });

  test("parses exit slash command", () => {
    const parsed = parseShellInput("/exit");
    expect(parsed.kind).toBe("slash");
    if (parsed.kind === "slash") {
      expect(parsed.name).toBe("exit");
    }
  });

  test("parses manual mcp add", () => {
    const parsed = parseShellInput("mcp add --server-code weather_mcp --url http://127.0.0.1:9001 --version v0");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command") {
      expect(parsed.group).toBe("mcp");
      expect(parsed.command).toBe("add");
      expect(readStringOption(parsed.options, "server-code")).toBe("weather_mcp");
      expect(readStringOption(parsed.options, "version")).toBe("v0");
    }
  });

  test("parses run events --follow <id>", () => {
    const parsed = parseShellInput("run events --follow exec-123");
    expect(parsed.kind).toBe("command");
    if (parsed.kind === "command" && parsed.group === "run") {
      expect(parsed.command).toBe("events");
      expect(readStringOption(parsed.options, "follow")).toBe("exec-123");
    }
  });

  test("returns text for non-command input", () => {
    const parsed = parseShellInput("hello world");
    expect(parsed.kind).toBe("text");
  });
});
