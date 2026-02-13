import { access, chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";

interface AuthTokenFile {
  token: string;
  savedAt: number;
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

function isTokenFile(input: unknown): input is AuthTokenFile {
  if (!input || typeof input !== "object") {
    return false;
  }
  const obj = input as Partial<AuthTokenFile>;
  return typeof obj.token === "string" && typeof obj.savedAt === "number";
}

export async function loadAuthToken(): Promise<string | null> {
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

  if (!isTokenFile(parsed)) {
    await rm(tokenFilePath, { force: true });
    return null;
  }
  if (parsed.token.trim() === "") {
    await rm(tokenFilePath, { force: true });
    return null;
  }
  return parsed.token;
}

export async function saveAuthToken(token: string): Promise<void> {
  await ensureStoreDirReady();
  const tokenFilePath = getTokenFilePath();
  const data: AuthTokenFile = {
    token,
    savedAt: Date.now(),
  };
  await writeFile(tokenFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await setSecurePermissions(tokenFilePath, 0o600);
}

export async function clearAuthToken(): Promise<void> {
  await ensureStoreDirReady();
  await rm(getTokenFilePath(), { force: true });
}
