import type { BusinessContract } from "../../domain/business-contract";

export type ExecutionStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface ExecutionViewEvent {
  id: string;
  ts: number;
  type: "SYSTEM" | "STATE_CHANGED" | "STEP_LOG" | "ARTIFACT_READY";
  message: string;
}

export interface ExecutionViewSnapshot {
  executionId: string;
  contractRef: string;
  objective: string;
  executionStrategy: string;
  status: ExecutionStatus;
  dagView: string[];
  artifacts: string[];
  events: ExecutionViewEvent[];
  updatedAt: number;
  lastError?: string;
}

export interface SubmitContractInput {
  sessionId: string;
  contract: BusinessContract;
  trigger: "interaction_surface" | "outer_scheduler";
}

export interface SubmitContractOutput {
  executionId: string;
  contractRef: string;
}

export interface ExecutionViewObserver {
  onEvent: (event: ExecutionViewEvent, snapshot: ExecutionViewSnapshot) => void;
  onDisconnect: (reason: string) => void;
  onError: (error: unknown) => void;
}

export interface ExecutionViewSubscription {
  unsubscribe: () => void;
}

export interface ProviderClient {
  readonly name: string;
  submitContract(input: SubmitContractInput): Promise<SubmitContractOutput>;
  getExecutionView(executionId: string): Promise<ExecutionViewSnapshot>;
  subscribeExecutionView(executionId: string, observer: ExecutionViewObserver): ExecutionViewSubscription;
}
