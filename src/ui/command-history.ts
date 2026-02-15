export interface CommandHistoryState {
  entries: string[];
  index: number | null;
  draftBeforeBrowse: string;
}

export interface CommandHistoryTransition {
  state: CommandHistoryState;
  nextDraft: string | null;
}

export const COMMAND_HISTORY_LIMIT = 200;

export function createCommandHistoryState(): CommandHistoryState {
  return {
    entries: [],
    index: null,
    draftBeforeBrowse: "",
  };
}

export function pushCommandHistory(state: CommandHistoryState, rawCommand: string): CommandHistoryState {
  const command = rawCommand.trim();
  if (command === "") {
    return {
      ...state,
      index: null,
      draftBeforeBrowse: "",
    };
  }

  const last = state.entries[state.entries.length - 1];
  if (last === command) {
    return {
      ...state,
      index: null,
      draftBeforeBrowse: "",
    };
  }

  const merged = [...state.entries, command];
  const entries = merged.length > COMMAND_HISTORY_LIMIT
    ? merged.slice(merged.length - COMMAND_HISTORY_LIMIT)
    : merged;

  return {
    entries,
    index: null,
    draftBeforeBrowse: "",
  };
}

export function browseCommandHistoryPrev(state: CommandHistoryState, currentDraft: string): CommandHistoryTransition {
  if (state.entries.length === 0) {
    return { state, nextDraft: null };
  }

  if (state.index === null) {
    const index = state.entries.length - 1;
    return {
      state: {
        ...state,
        index,
        draftBeforeBrowse: currentDraft,
      },
      nextDraft: state.entries[index] ?? "",
    };
  }

  const index = Math.max(state.index - 1, 0);
  return {
    state: {
      ...state,
      index,
    },
    nextDraft: state.entries[index] ?? "",
  };
}

export function browseCommandHistoryNext(state: CommandHistoryState): CommandHistoryTransition {
  if (state.entries.length === 0 || state.index === null) {
    return { state, nextDraft: null };
  }

  if (state.index < state.entries.length - 1) {
    const index = state.index + 1;
    return {
      state: {
        ...state,
        index,
      },
      nextDraft: state.entries[index] ?? "",
    };
  }

  return {
    state: {
      ...state,
      index: null,
      draftBeforeBrowse: "",
    },
    nextDraft: state.draftBeforeBrowse,
  };
}
