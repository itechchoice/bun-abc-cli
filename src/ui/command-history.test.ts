import { describe, expect, test } from "bun:test";
import {
  browseCommandHistoryNext,
  browseCommandHistoryPrev,
  COMMAND_HISTORY_LIMIT,
  createCommandHistoryState,
  pushCommandHistory,
} from "./command-history";

describe("command-history", () => {
  test("ignores empty and consecutive duplicate commands", () => {
    let state = createCommandHistoryState();
    state = pushCommandHistory(state, "");
    state = pushCommandHistory(state, "mcp list");
    state = pushCommandHistory(state, "mcp list");
    expect(state.entries).toEqual(["mcp list"]);
  });

  test("drops oldest commands when exceeds limit", () => {
    let state = createCommandHistoryState();
    for (let i = 0; i < COMMAND_HISTORY_LIMIT + 2; i += 1) {
      state = pushCommandHistory(state, `cmd-${i}`);
    }
    expect(state.entries.length).toBe(COMMAND_HISTORY_LIMIT);
    expect(state.entries[0]).toBe("cmd-2");
    expect(state.entries[state.entries.length - 1]).toBe(`cmd-${COMMAND_HISTORY_LIMIT + 1}`);
  });

  test("browses up and down, then restores draft", () => {
    let state = createCommandHistoryState();
    state = pushCommandHistory(state, "first");
    state = pushCommandHistory(state, "second");
    state = pushCommandHistory(state, "third");

    const up1 = browseCommandHistoryPrev(state, "typing");
    expect(up1.nextDraft).toBe("third");

    const up2 = browseCommandHistoryPrev(up1.state, "ignored");
    expect(up2.nextDraft).toBe("second");

    const down1 = browseCommandHistoryNext(up2.state);
    expect(down1.nextDraft).toBe("third");

    const down2 = browseCommandHistoryNext(down1.state);
    expect(down2.nextDraft).toBe("typing");
    expect(down2.state.index).toBeNull();
  });
});
