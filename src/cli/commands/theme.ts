/**
 * Theme command handlers.
 */

import { readStringOption } from "../shell/parser";
import type { ParsedCommandInput } from "../shell/types";
import { THEME_NAMES, isThemeName } from "../../theme/themes";
import type { CommandContext } from "./types";

export async function executeThemeCommand(ctx: CommandContext, parsed: ParsedCommandInput): Promise<void> {
  if (parsed.command === "list") {
    ctx.logger.appendJsonBlock("info", { themes: THEME_NAMES });
    return;
  }

  if (parsed.command === "current") {
    ctx.logger.appendJsonBlock("info", { theme: ctx.themeName });
    return;
  }

  if (parsed.command === "set") {
    const positional = parsed.positionals[0]?.trim();
    const optionName = readStringOption(parsed.options, "name")?.trim();
    if (parsed.positionals.length > 1) {
      throw new Error("theme set accepts only one positional theme name.");
    }
    if (positional && optionName && positional !== optionName) {
      throw new Error("Conflicting theme names between positional and --name.");
    }
    const rawThemeName = optionName ?? positional;
    if (!rawThemeName) {
      throw new Error("theme set requires <name> or --name <theme>.");
    }
    if (!isThemeName(rawThemeName)) {
      ctx.logger.appendLog("error", `Unknown theme '${rawThemeName}'.`);
      ctx.logger.appendJsonBlock("info", { available: THEME_NAMES });
      return;
    }

    await ctx.setThemeName(rawThemeName);
    ctx.setIsThemePickerOpen(false);
    ctx.logger.appendLog("success", `Theme switched to '${rawThemeName}'.`);
    ctx.logger.appendJsonBlock("info", { theme: rawThemeName, persisted: true });
    return;
  }

  throw new Error("Unsupported theme command.");
}

export function applyThemeFromPicker(ctx: CommandContext, name: string): Promise<void> | void {
  if (!isThemeName(name)) {
    ctx.logger.appendLog("error", `Unknown theme '${name}'.`);
    ctx.logger.appendJsonBlock("info", { available: THEME_NAMES });
    return;
  }
  const result = ctx.setThemeName(name);
  ctx.setIsThemePickerOpen(false);
  ctx.logger.appendLog("success", `Theme switched to '${name}'.`);
  ctx.logger.appendJsonBlock("info", { theme: name, persisted: true });
  return result as Promise<void> | void;
}
