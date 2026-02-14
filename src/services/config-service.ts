export interface RuntimeConfig {
  provider: string;
  apiBaseUrl: string;
}

export interface ConfigService {
  getRuntimeConfig(): RuntimeConfig;
}
