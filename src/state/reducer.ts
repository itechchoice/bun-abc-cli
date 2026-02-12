import type { AppAction, AppState, ExecutionViewModel } from "./types";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function isTerminalStatus(status: string | null): boolean {
  return status !== null && TERMINAL_STATUSES.has(status);
}

function createInitialViewModel(): ExecutionViewModel {
  return {
    executionId: null,
    contractRef: null,
    objective: "",
    executionStrategy: "once",
    status: null,
    dagView: [],
    artifacts: [],
    events: [],
    lastUpdatedAt: null,
    reconnecting: false,
  };
}

export function createInitialState(sessionId: string): AppState {
  return {
    sessionId,
    draft: "",
    status: "idle",
    surfacePhase: "editing",
    errorText: "",
    activeExecutionId: null,
    lastContractRef: null,
    lastSubmittedContract: null,
    viewModel: createInitialViewModel(),
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "draft/set":
      return {
        ...state,
        draft: action.value,
      };
    case "intent/new":
      return {
        ...state,
        draft: "",
        status: "idle",
        surfacePhase: "editing",
        errorText: "",
        activeExecutionId: null,
        lastContractRef: null,
        lastSubmittedContract: null,
        viewModel: createInitialViewModel(),
      };
    case "intent/submit_start":
      return {
        ...state,
        status: "submitting",
        surfacePhase: "submitted",
        errorText: "",
        draft: "",
        lastSubmittedContract: action.contract,
      };
    case "intent/submit_success":
      return {
        ...state,
        activeExecutionId: action.executionId,
        lastContractRef: action.contractRef,
      };
    case "intent/submit_error":
      return {
        ...state,
        status: "error",
        surfacePhase: "editing",
        errorText: action.errorText,
        draft: action.draft,
      };
    case "observe/start":
      return {
        ...state,
        status: "observing",
        surfacePhase: "observing",
        errorText: "",
        viewModel: {
          ...state.viewModel,
          reconnecting: false,
        },
      };
    case "observe/sync_snapshot": {
      const nextStatus = action.snapshot.status;
      return {
        ...state,
        status: isTerminalStatus(nextStatus) ? "idle" : "observing",
        surfacePhase: isTerminalStatus(nextStatus) ? "terminal" : "observing",
        viewModel: {
          executionId: action.snapshot.executionId,
          contractRef: action.snapshot.contractRef,
          objective: action.snapshot.objective,
          executionStrategy: action.snapshot.executionStrategy,
          status: action.snapshot.status,
          dagView: [...action.snapshot.dagView],
          artifacts: [...action.snapshot.artifacts],
          events: [...action.snapshot.events],
          lastUpdatedAt: action.snapshot.updatedAt,
          reconnecting: false,
        },
      };
    }
    case "observe/disconnected":
      return {
        ...state,
        viewModel: {
          ...state.viewModel,
          reconnecting: true,
        },
      };
    case "observe/error":
      return {
        ...state,
        status: "error",
        errorText: action.errorText,
      };
    case "chat/clear_error":
      return {
        ...state,
        status: state.status === "error" ? "idle" : state.status,
        errorText: "",
      };
    case "session/reset":
      return createInitialState(action.sessionId);
    default: {
      const _never: never = action;
      return state;
    }
  }
}
