export interface RuntimeConfig {
  provider: string;
}

export interface ConfigService {
  getRuntimeConfig(): RuntimeConfig;
}
