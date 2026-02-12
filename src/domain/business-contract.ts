export type ExecutionStrategyMode = "once" | "max_runs" | "cron" | "until_condition";

export interface ExecutionStrategyIntent {
  mode: ExecutionStrategyMode;
  maxRuns?: number;
  cron?: string;
  untilCondition?: string;
}

export interface BusinessContract {
  objective: string;
  contextRefs: string[];
  constraints: string[];
  executionStrategy: ExecutionStrategyIntent;
}

interface ParsedDraftFields {
  objective: string;
  contextRefs: string[];
  constraints: string[];
  executionStrategy: string | null;
}

export interface BusinessContractDraftResult {
  contract: BusinessContract;
  normalizedDraft: string;
}

const MAX_REF_COUNT = 12;
const MAX_CONSTRAINT_COUNT = 12;

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseDraftFields(rawDraft: string): ParsedDraftFields {
  const draft = rawDraft.trim();
  if (draft === "") {
    return {
      objective: "",
      contextRefs: [],
      constraints: [],
      executionStrategy: null,
    };
  }

  const lines = draft.split("\n").map((line) => line.trim());
  let objective = "";
  let contextRefs: string[] = [];
  let constraints: string[] = [];
  let executionStrategy: string | null = null;

  for (const line of lines) {
    if (line.startsWith("objective:")) {
      objective = line.slice("objective:".length).trim();
      continue;
    }
    if (line.startsWith("context_refs:")) {
      contextRefs = parseCommaSeparated(line.slice("context_refs:".length).trim());
      continue;
    }
    if (line.startsWith("constraints:")) {
      constraints = parseCommaSeparated(line.slice("constraints:".length).trim());
      continue;
    }
    if (line.startsWith("execution_strategy:")) {
      executionStrategy = line.slice("execution_strategy:".length).trim();
      continue;
    }
  }

  // Fallback: plain text means objective only.
  if (objective === "" && !draft.includes("\n")) {
    objective = draft;
  }

  return {
    objective,
    contextRefs,
    constraints,
    executionStrategy,
  };
}

function parseExecutionStrategy(rawValue: string | null): ExecutionStrategyIntent {
  if (!rawValue || rawValue === "once") {
    return { mode: "once" };
  }

  if (rawValue.startsWith("max_runs:")) {
    const value = Number(rawValue.slice("max_runs:".length));
    if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
      throw new Error("execution_strategy max_runs must be a positive integer.");
    }
    return { mode: "max_runs", maxRuns: value };
  }

  if (rawValue.startsWith("cron:")) {
    const cron = rawValue.slice("cron:".length).trim();
    if (cron === "") {
      throw new Error("execution_strategy cron cannot be empty.");
    }
    return { mode: "cron", cron };
  }

  if (rawValue.startsWith("until_condition:")) {
    const untilCondition = rawValue.slice("until_condition:".length).trim();
    if (untilCondition === "") {
      throw new Error("execution_strategy until_condition cannot be empty.");
    }
    return { mode: "until_condition", untilCondition };
  }

  throw new Error("execution_strategy must be one of: once, max_runs:N, cron:..., until_condition:...");
}

function normalizeUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}

function validateContract(contract: BusinessContract): void {
  if (contract.objective.trim() === "") {
    throw new Error("Business Contract objective is required.");
  }
  if (contract.contextRefs.length > MAX_REF_COUNT) {
    throw new Error(`Business Contract context_refs exceeds ${MAX_REF_COUNT} entries.`);
  }
  if (contract.constraints.length > MAX_CONSTRAINT_COUNT) {
    throw new Error(`Business Contract constraints exceeds ${MAX_CONSTRAINT_COUNT} entries.`);
  }
}

export function parseBusinessContractDraft(rawDraft: string): BusinessContractDraftResult {
  const fields = parseDraftFields(rawDraft);
  const contract: BusinessContract = {
    objective: fields.objective,
    contextRefs: normalizeUnique(fields.contextRefs),
    constraints: normalizeUnique(fields.constraints),
    executionStrategy: parseExecutionStrategy(fields.executionStrategy),
  };

  validateContract(contract);

  const normalizedDraft = [
    `objective: ${contract.objective}`,
    `context_refs: ${contract.contextRefs.join(",")}`,
    `constraints: ${contract.constraints.join(",")}`,
    `execution_strategy: ${formatExecutionStrategy(contract.executionStrategy)}`,
  ].join("\n");

  return { contract, normalizedDraft };
}

export function formatExecutionStrategy(strategy: ExecutionStrategyIntent): string {
  if (strategy.mode === "once") {
    return "once";
  }
  if (strategy.mode === "max_runs") {
    return `max_runs:${strategy.maxRuns ?? 1}`;
  }
  if (strategy.mode === "cron") {
    return `cron:${strategy.cron ?? ""}`;
  }
  return `until_condition:${strategy.untilCondition ?? ""}`;
}
