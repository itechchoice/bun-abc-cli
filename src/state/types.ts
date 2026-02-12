import type { BusinessContract } from "../domain/business-contract";
import type { ExecutionStatus, ExecutionViewEvent, ExecutionViewSnapshot } from "../adapters/provider/types";

export type AppStatus = "idle" | "submitting" | "observing" | "error";
export type SurfacePhase = "editing" | "submitted" | "observing" | "terminal";

export interface ExecutionViewModel {
  executionId: string | null;
  contractRef: string | null;
  objective: string;
  executionStrategy: string;
  status: ExecutionStatus | null;
  dagView: string[];
  artifacts: string[];
  events: ExecutionViewEvent[];
  lastUpdatedAt: number | null;
  reconnecting: boolean;
}

export interface AppState {
  sessionId: string;
  draft: string;
  status: AppStatus;
  surfacePhase: SurfacePhase;
  errorText: string;
  activeExecutionId: string | null;
  lastContractRef: string | null;
  lastSubmittedContract: BusinessContract | null;
  viewModel: ExecutionViewModel;
}

export type AppAction =
  | { type: "draft/set"; value: string }
  | { type: "intent/new" }
  | { type: "intent/submit_start"; contract: BusinessContract }
  | { type: "intent/submit_success"; executionId: string; contractRef: string }
  | { type: "intent/submit_error"; errorText: string; draft: string }
  | { type: "observe/start" }
  | { type: "observe/sync_snapshot"; snapshot: ExecutionViewSnapshot }
  | { type: "observe/disconnected" }
  | { type: "observe/error"; errorText: string }
  | { type: "chat/clear_error" }
  | { type: "session/reset"; sessionId: string };
