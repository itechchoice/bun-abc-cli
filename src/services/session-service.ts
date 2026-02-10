export interface SessionService {
  createSessionId(): string;
  reset(): string;
}
