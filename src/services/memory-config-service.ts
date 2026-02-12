import type { ConfigService, RuntimeConfig } from "./config-service";

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  provider: "contract-mock",
};

export function createMemoryConfigService(): ConfigService {
  return {
    getRuntimeConfig() {
      return { ...DEFAULT_RUNTIME_CONFIG };
    },
  };
}
