/**
 * Auth hook — manages login flow, token refresh, 401 auto-retry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformApiClient } from "../adapters/platform-api/client";
import type { ApiResponse } from "../adapters/platform-api/types";
import { clearAuthToken, loadAuthSession, saveAuthSession } from "../cli/shell/auth-token-store";
import type { AuthSessionState, LoginStep } from "../cli/shell/types";
import { readJwtExpiryMs, readStringField } from "../utils/json-helpers";
import type { ShellLogger } from "./use-shell-log";

export interface AuthActions {
  ensureLoggedIn: () => string;
  refreshAccessToken: (reasonLabel?: string, clearWhenMissing?: boolean) => Promise<string | null>;
  runWithAutoRefresh: (execute: (accessToken: string) => Promise<ApiResponse>) => Promise<ApiResponse>;
  clearAuthState: () => Promise<void>;
  saveAndSetAuthState: (next: { accessToken: string; refreshToken?: string | null; username?: string | null }) => Promise<void>;
  consumeLoginStep: (rawInput: string) => Promise<void>;
  startLogin: () => void;
}

export interface AuthState {
  authState: AuthSessionState;
  loginStep: LoginStep;
  loginHint: string | null;
  isPasswordInput: boolean;
  isAwaitingLoginInput: boolean;
  pendingRequestCount: number;
}

interface UseAuthOptions {
  apiClient: PlatformApiClient;
  logger: ShellLogger;
  themeWarning?: string | null;
}

export function useAuth(options: UseAuthOptions): AuthState & AuthActions {
  const { apiClient, logger } = options;
  const { appendLog, printApiResponse } = logger;

  const [authState, setAuthState] = useState<AuthSessionState>({
    accessToken: null,
    refreshToken: null,
    username: null,
    loginAt: null,
  });
  const [loginStep, setLoginStep] = useState<LoginStep>("idle");
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const loginDraftRef = useRef<{ username: string | null }>({ username: null });
  const stoppedRef = useRef(false);
  const themeWarningLoggedRef = useRef(false);

  // ---- request tracking ----

  const beginRequest = useCallback(() => {
    setPendingRequestCount((prev) => prev + 1);
  }, []);

  const endRequest = useCallback(() => {
    setPendingRequestCount((prev) => (prev <= 0 ? 0 : prev - 1));
  }, []);

  const trackRequest = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    beginRequest();
    try {
      return await fn();
    } finally {
      endRequest();
    }
  }, [beginRequest, endRequest]);

  // ---- auth state helpers ----

  const clearAuth = useCallback(async () => {
    setAuthState({ accessToken: null, refreshToken: null, username: null, loginAt: null });
    await clearAuthToken();
  }, []);

  const saveAndSetAuthState = useCallback(
    async (next: { accessToken: string; refreshToken?: string | null; username?: string | null }) => {
      const normalizedRefreshToken = next.refreshToken?.trim() ? next.refreshToken : undefined;
      await saveAuthSession({
        accessToken: next.accessToken,
        ...(normalizedRefreshToken ? { refreshToken: normalizedRefreshToken } : {}),
      });
      setAuthState((prev) => ({
        accessToken: next.accessToken,
        refreshToken: normalizedRefreshToken ?? null,
        username: next.username ?? prev.username ?? null,
        loginAt: Date.now(),
      }));
    },
    [],
  );

  const ensureLoggedIn = useCallback((): string => {
    if (!authState.accessToken) {
      throw new Error("Not logged in. Run /login first.");
    }
    return authState.accessToken;
  }, [authState.accessToken]);

  // ---- token refresh ----

  const refreshAccessToken = useCallback(
    async (reasonLabel = "Access token expired. Trying auth refresh...", clearWhenMissing = true): Promise<string | null> => {
      const refreshToken = authState.refreshToken;
      if (!refreshToken) {
        if (clearWhenMissing) {
          await clearAuth();
        }
        appendLog("error", "No refresh_token found. Please run /login.");
        return null;
      }

      appendLog("info", reasonLabel);
      const refreshResponse = await trackRequest(() => apiClient.refreshToken(refreshToken));
      printApiResponse(refreshResponse);

      if (!refreshResponse.ok) {
        await clearAuth();
        appendLog("error", "Token refresh failed. Please run /login.");
        return null;
      }

      const nextAccessToken = readStringField(refreshResponse.body, "access_token");
      const nextRefreshToken = readStringField(refreshResponse.body, "refresh_token");

      if (!nextAccessToken) {
        await clearAuth();
        appendLog("error", "Refresh response missing access_token. Please run /login.");
        return null;
      }

      await saveAndSetAuthState({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken ?? refreshToken,
      });
      appendLog("success", "Token refreshed.");
      return nextAccessToken;
    },
    [authState.refreshToken, appendLog, clearAuth, apiClient, printApiResponse, saveAndSetAuthState, trackRequest],
  );

  // ---- auto-retry on 401 ----

  const runWithAutoRefresh = useCallback(
    async (execute: (accessToken: string) => Promise<ApiResponse>): Promise<ApiResponse> => {
      const accessToken = ensureLoggedIn();
      let response = await trackRequest(() => execute(accessToken));
      printApiResponse(response);

      if (response.status !== 401) {
        return response;
      }

      const nextAccessToken = await refreshAccessToken();
      if (!nextAccessToken) {
        return response;
      }

      appendLog("info", "Retrying previous request with refreshed token...");
      response = await trackRequest(() => execute(nextAccessToken));
      printApiResponse(response);

      if (response.status === 401) {
        await clearAuth();
        appendLog("error", "Authorization expired or invalid after retry. Please run /login.");
      }

      return response;
    },
    [appendLog, clearAuth, ensureLoggedIn, printApiResponse, refreshAccessToken, trackRequest],
  );

  // ---- login two-step state machine ----

  const consumeLoginStep = useCallback(async (rawInput: string) => {
    const value = rawInput.trim();

    if (loginStep === "await_username") {
      if (!value) {
        appendLog("error", "Username cannot be empty.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Username cannot start with '/'.");
        return;
      }

      loginDraftRef.current = { username: value };
      setLoginStep("await_password");
      appendLog("info", "Enter password (masked).");
      return;
    }

    if (loginStep === "await_password") {
      if (!value) {
        appendLog("error", "Password cannot be empty.");
        return;
      }
      if (value.startsWith("/")) {
        appendLog("error", "Password cannot start with '/'.");
        return;
      }

      const username = loginDraftRef.current.username;
      if (!username) {
        setLoginStep("idle");
        appendLog("error", "Login state mismatch. Run /login again.");
        return;
      }

      const response = await trackRequest(() => apiClient.login({ username, password: value }));
      printApiResponse(response);

      if (!response.ok) {
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      const accessToken = readStringField(response.body, "access_token");
      const refreshToken = readStringField(response.body, "refresh_token");
      if (!accessToken) {
        appendLog("error", "Login response missing access_token.");
        setLoginStep("idle");
        loginDraftRef.current = { username: null };
        return;
      }

      await saveAndSetAuthState({ accessToken, refreshToken, username });
      setLoginStep("idle");
      loginDraftRef.current = { username: null };
      appendLog("success", `Login succeeded for '${username}'.`);
    }
  }, [appendLog, loginStep, apiClient, printApiResponse, saveAndSetAuthState, trackRequest]);

  const startLogin = useCallback(() => {
    setLoginStep("await_username");
    loginDraftRef.current = { username: null };
    appendLog("info", "Login started. Enter username.");
  }, [appendLog]);

  // ---- lifecycle: restore token on mount ----

  useEffect(() => {
    stoppedRef.current = false;

    void (async () => {
      try {
        const session = await loadAuthSession();
        if (!session) {
          return;
        }

        const expiryMs = readJwtExpiryMs(session.accessToken);
        if (expiryMs !== null && Date.now() >= expiryMs) {
          await clearAuthToken();
          setAuthState({ accessToken: null, refreshToken: null, username: null, loginAt: null });
          appendLog("error", "Stored token is expired. Please run /login.");
          return;
        }

        setAuthState({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? null,
          username: null,
          loginAt: Date.now(),
        });
        appendLog("success", "Restored auth session from local store.");
      } catch (error) {
        appendLog("error", `Failed to restore token: ${error instanceof Error ? error.message : String(error)}`);
      }
    })();

    return () => {
      stoppedRef.current = true;
    };
  }, [appendLog]);

  // ---- lifecycle: theme warning ----

  useEffect(() => {
    if (!options.themeWarning || themeWarningLoggedRef.current) {
      return;
    }
    appendLog("error", options.themeWarning);
    themeWarningLoggedRef.current = true;
  }, [appendLog, options.themeWarning]);

  // ---- derived state ----

  const loginHint = useMemo(() => {
    if (loginStep === "await_username") {
      return "login> enter username";
    }
    if (loginStep === "await_password") {
      return "login> enter password (masked)";
    }
    return null;
  }, [loginStep]);

  return {
    authState,
    loginStep,
    loginHint,
    isPasswordInput: loginStep === "await_password",
    isAwaitingLoginInput: loginStep !== "idle",
    pendingRequestCount,
    ensureLoggedIn,
    refreshAccessToken,
    runWithAutoRefresh,
    clearAuthState: clearAuth,
    saveAndSetAuthState,
    consumeLoginStep,
    startLogin,
  };
}
