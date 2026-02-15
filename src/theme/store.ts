import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { isThemeName } from "./themes";
import type { ThemeName } from "./types";

interface ThemeFile {
  theme: ThemeName;
  savedAt: number;
}

interface LoadThemeResult {
  themeName: ThemeName | null;
  warning: string | null;
}

function getStoreDirPath(): string {
  if (process.env.ABC_CLI_HOME && process.env.ABC_CLI_HOME.trim() !== "") {
    return process.env.ABC_CLI_HOME;
  }
  return path.join(os.homedir(), ".abc-cli");
}

function getThemeFilePath(): string {
  return path.join(getStoreDirPath(), "theme.json");
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

function isThemeFile(input: unknown): input is ThemeFile {
  if (!input || typeof input !== "object") {
    return false;
  }
  const obj = input as Partial<ThemeFile>;
  return typeof obj.savedAt === "number" && typeof obj.theme === "string" && isThemeName(obj.theme);
}

export async function loadThemeNameWithWarning(): Promise<LoadThemeResult> {
  await ensureStoreDirReady();
  const themeFilePath = getThemeFilePath();
  if (!(await pathExists(themeFilePath))) {
    return { themeName: null, warning: null };
  }

  await setSecurePermissions(themeFilePath, 0o600);
  const raw = await readFile(themeFilePath, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const backupPath = `${themeFilePath}.corrupt-${Date.now()}.json`;
    await rename(themeFilePath, backupPath);
    return {
      themeName: null,
      warning: `Theme file is corrupted and has been backed up to ${backupPath}.`,
    };
  }

  if (!isThemeFile(parsed)) {
    const backupPath = `${themeFilePath}.corrupt-${Date.now()}.json`;
    await rename(themeFilePath, backupPath);
    return {
      themeName: null,
      warning: `Theme file has invalid schema and has been backed up to ${backupPath}.`,
    };
  }

  return {
    themeName: parsed.theme,
    warning: null,
  };
}

export async function loadThemeName(): Promise<ThemeName | null> {
  const result = await loadThemeNameWithWarning();
  return result.themeName;
}

export async function saveThemeName(name: ThemeName): Promise<void> {
  await ensureStoreDirReady();
  const themeFilePath = getThemeFilePath();
  const data: ThemeFile = {
    theme: name,
    savedAt: Date.now(),
  };
  await writeFile(themeFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await setSecurePermissions(themeFilePath, 0o600);
}
