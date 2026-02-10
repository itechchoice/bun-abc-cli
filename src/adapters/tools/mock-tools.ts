import type { ToolRegistry } from "./types";

export class MockToolRegistry implements ToolRegistry {
  readonly label = "mock-ready";

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    return `Mock tool '${name}' is not implemented. input=${JSON.stringify(input)}`;
  }
}
