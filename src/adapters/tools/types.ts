export interface ToolRegistry {
  readonly label: string;
  execute(name: string, input: Record<string, unknown>): Promise<string>;
}
