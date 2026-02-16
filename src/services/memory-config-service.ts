import type { ConfigService, RuntimeConfig } from "./config-service";
import { DEFAULT_BASE_URL } from "../constants";

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
