import type { ProviderClient, ProviderSendInput, ProviderSendOutput } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class MockProviderClient implements ProviderClient {
  readonly name = "mock";

  async send(input: ProviderSendInput): Promise<ProviderSendOutput> {
    const prompt = input.prompt.trim();

    await sleep(220);

    if (prompt === "/fail") {
      throw new Error("Mock provider forced failure for /fail.");
    }

    return {
      reply: `Mock response: ${prompt}`,
    };
  }
}
