import { formatExecutionStrategy } from "../../domain/business-contract";
import type {
  ExecutionStatus,
  ExecutionViewEvent,
  ExecutionViewObserver,
  ExecutionViewSnapshot,
  ExecutionViewSubscription,
  ProviderClient,
  SubmitContractInput,
  SubmitContractOutput,
} from "./types";

interface MockExecutionRuntime {
  snapshot: ExecutionViewSnapshot;
  observers: Set<ExecutionViewObserver>;
  disconnectInjected: boolean;
}

const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function isTerminalStatus(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function nextId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
}

function createEvent(type: ExecutionViewEvent["type"], message: string): ExecutionViewEvent {
  return {
    id: nextId("evt"),
    ts: Date.now(),
    type,
    message,
  };
}

export class MockProviderClient implements ProviderClient {
  readonly name = "contract-mock";

  private readonly runs = new Map<string, MockExecutionRuntime>();

  async submitContract(input: SubmitContractInput): Promise<SubmitContractOutput> {
    const executionId = nextId("exec");
    const contractRef = nextId("contract");
    const strategy = formatExecutionStrategy(input.contract.executionStrategy);
    const acceptedEvent = createEvent("SYSTEM", "Run Request accepted by Decision Plane.");

    const runtime: MockExecutionRuntime = {
      snapshot: {
        executionId,
        contractRef,
        objective: input.contract.objective,
        executionStrategy: strategy,
        status: "QUEUED",
        dagView: ["compile_eb", "reconcile_state", "execute_units"],
        artifacts: [],
        events: [acceptedEvent],
        updatedAt: Date.now(),
      },
      observers: new Set<ExecutionViewObserver>(),
      disconnectInjected: false,
    };

    this.runs.set(executionId, runtime);
    this.scheduleLifecycle(runtime);

    return { executionId, contractRef };
  }

  async getExecutionView(executionId: string): Promise<ExecutionViewSnapshot> {
    const runtime = this.runs.get(executionId);
    if (!runtime) {
      throw new Error(`Execution ${executionId} not found.`);
    }
    return {
      ...runtime.snapshot,
      dagView: [...runtime.snapshot.dagView],
      artifacts: [...runtime.snapshot.artifacts],
      events: [...runtime.snapshot.events],
    };
  }

  subscribeExecutionView(executionId: string, observer: ExecutionViewObserver): ExecutionViewSubscription {
    const runtime = this.runs.get(executionId);
    if (!runtime) {
      throw new Error(`Execution ${executionId} not found.`);
    }

    runtime.observers.add(observer);

    return {
      unsubscribe: () => {
        runtime.observers.delete(observer);
      },
    };
  }

  private scheduleLifecycle(runtime: MockExecutionRuntime): void {
    this.emit(runtime, "STATE_CHANGED", "Execution queued.");

    setTimeout(() => {
      this.transition(runtime, "RUNNING", "Execution started.");
    }, 220);

    setTimeout(() => {
      this.emit(runtime, "STEP_LOG", "Gateway enforced EP; dispatching execution units.");
    }, 430);

    setTimeout(() => {
      runtime.snapshot.artifacts = [...runtime.snapshot.artifacts, "artifact://summary.json"];
      this.emit(runtime, "ARTIFACT_READY", "Artifact generated: summary.json");
    }, 620);

    setTimeout(() => {
      if (runtime.disconnectInjected || isTerminalStatus(runtime.snapshot.status)) {
        return;
      }
      runtime.disconnectInjected = true;
      for (const observer of runtime.observers) {
        observer.onDisconnect("mock stream interrupted");
      }
      runtime.observers.clear();
    }, 760);

    setTimeout(() => {
      const objective = runtime.snapshot.objective.toLowerCase();
      if (objective.includes("[cancel]")) {
        this.transition(runtime, "CANCELLED", "Execution cancelled by external request.");
        return;
      }
      if (objective.includes("[fail]")) {
        runtime.snapshot.lastError = "Mock failure injected by objective marker [fail].";
        this.transition(runtime, "FAILED", "Execution failed at mocked unit.");
        return;
      }
      this.transition(runtime, "COMPLETED", "Execution completed.");
    }, 1200);
  }

  private transition(runtime: MockExecutionRuntime, status: ExecutionStatus, message: string): void {
    runtime.snapshot.status = status;
    this.emit(runtime, "STATE_CHANGED", message);
  }

  private emit(runtime: MockExecutionRuntime, type: ExecutionViewEvent["type"], message: string): void {
    const event = createEvent(type, message);
    runtime.snapshot.events = [...runtime.snapshot.events, event];
    runtime.snapshot.updatedAt = event.ts;

    for (const observer of runtime.observers) {
      observer.onEvent(event, {
        ...runtime.snapshot,
        dagView: [...runtime.snapshot.dagView],
        artifacts: [...runtime.snapshot.artifacts],
        events: [...runtime.snapshot.events],
      });
    }
  }
}
