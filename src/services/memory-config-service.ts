import type { ConfigService, RuntimeConfig } from "./config-service";

const DEFAULT_BASE_URL = "https://arch.stg.alphabitcore.io/api/v1";

export function createMemoryConfigService(): ConfigService {
  return {
    getRuntimeConfig(): RuntimeConfig {
      return {
        provider: "platform",
        apiBaseUrl: process.env.ABC_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
      };
    },
  };
}
