/**
 * Auth command handlers.
 */

import type { ParsedCommandInput } from "../shell/types";
import type { CommandContext } from "./types";

export async function executeAuthCommand(ctx: CommandContext, parsed: ParsedCommandInput): Promise<void> {
  if (parsed.command !== "refresh") {
    throw new Error("Unsupported auth command.");
  }
  if (parsed.positionals.length > 0) {
    throw new Error("auth refresh does not accept positional arguments.");
  }
  await ctx.refreshAccessToken("Manual auth refresh requested.", false);
}
