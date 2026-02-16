import { access, chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";

interface AuthSessionFileV2 {
  accessToken: string;
  refreshToken?: string;
  savedAt: number;
}

interface AuthTokenFileV1 {
  token: string;
  savedAt: number;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken?: string;
}

function getStoreDirPath(): string {
  if (process.env.ABC_CLI_HOME && process.env.ABC_CLI_HOME.trim() !== "") {
    return process.env.ABC_CLI_HOME;
  }
  return path.join(os.homedir(), ".abc-cli");
}

function getTokenFilePath(): string {
  return path.join(getStoreDirPath(), "auth-token.json");
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function setSecurePermissions(targetPath: string, mode: number): Promise<void> {
  if (process.platform === "win32") {
    return;
  }
  await chmod(targetPath, mode);
}

async function ensureStoreDirReady(): Promise<void> {
  const storeDirPath = getStoreDirPath();
  await mkdir(storeDirPath, { recursive: true, mode: 0o700 });
  await setSecurePermissions(storeDirPath, 0o700);
}

function isTokenFileV1(input: unknown): input is AuthTokenFileV1 {
  if (!input || typeof input !== "object") {
    return false;
  }
  const obj = input as Partial<AuthTokenFileV1>;
  return typeof obj.token === "string" && typeof obj.savedAt === "number";
}

function isSessionFileV2(input: unknown): input is AuthSessionFileV2 {
  if (!input || typeof input !== "object") {
    return false;
  }
  const obj = input as Partial<AuthSessionFileV2>;
  const refreshTokenOk = obj.refreshToken === undefined || typeof obj.refreshToken === "string";
  return typeof obj.accessToken === "string" && typeof obj.savedAt === "number" && refreshTokenOk;
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  await ensureStoreDirReady();
  const tokenFilePath = getTokenFilePath();
  if (!(await pathExists(tokenFilePath))) {
    return null;
  }

  await setSecurePermissions(tokenFilePath, 0o600);
  const raw = await readFile(tokenFilePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const backupPath = `${tokenFilePath}.corrupt-${Date.now()}.json`;
    await rename(tokenFilePath, backupPath);
    return null;
  }

  if (isSessionFileV2(parsed)) {
    if (parsed.accessToken.trim() === "") {
      await rm(tokenFilePath, { force: true });
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken?.trim() ? parsed.refreshToken : undefined,
    };
  }

  if (isTokenFileV1(parsed)) {
    if (parsed.token.trim() === "") {
      await rm(tokenFilePath, { force: true });
      return null;
    }
    return {
      accessToken: parsed.token,
    };
  }

  if (!isSessionFileV2(parsed) && !isTokenFileV1(parsed)) {
    await rm(tokenFilePath, { force: true });
    return null;
  }

  return null;
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  await ensureStoreDirReady();
  const tokenFilePath = getTokenFilePath();
  const data: AuthSessionFileV2 = {
    accessToken: session.accessToken,
    ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    savedAt: Date.now(),
  };
  await writeFile(tokenFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await setSecurePermissions(tokenFilePath, 0o600);
}

export async function loadAuthToken(): Promise<string | null> {
  const session = await loadAuthSession();
  return session?.accessToken ?? null;
}

export async function saveAuthToken(token: string): Promise<void> {
  await saveAuthSession({ accessToken: token });
}

export async function clearAuthToken(): Promise<void> {
  await ensureStoreDirReady();
  await rm(getTokenFilePath(), { force: true });
}
