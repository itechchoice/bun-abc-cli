import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadThemeName, loadThemeNameWithWarning, saveThemeName } from "./store";

const allocatedDirs: string[] = [];

async function withTempStoreHome(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "abc-cli-theme-test-"));
  allocatedDirs.push(dir);
  process.env.ABC_CLI_HOME = dir;
  return dir;
}

afterEach(async () => {
  delete process.env.ABC_CLI_HOME;
  delete process.env.ABC_THEME;
  while (allocatedDirs.length > 0) {
    const dir = allocatedDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("theme-store", () => {
  test("saves and loads theme", async () => {
    await withTempStoreHome();
    await saveThemeName("light-hc");
    const themeName = await loadThemeName();
    expect(themeName).toBe("light-hc");
  });

  test("applies secure permissions for store dir and theme file", async () => {
    if (process.platform === "win32") {
      return;
    }

    const dir = await withTempStoreHome();
    await saveThemeName("dark");

    const dirStat = await stat(dir);
    const fileStat = await stat(path.join(dir, "theme.json"));

    expect(dirStat.mode & 0o777).toBe(0o700);
    expect(fileStat.mode & 0o777).toBe(0o600);
  });

  test("backs up corrupt theme file", async () => {
    const dir = await withTempStoreHome();
    const themeFilePath = path.join(dir, "theme.json");
    await writeFile(themeFilePath, "{bad-json", "utf8");

    const result = await loadThemeNameWithWarning();
    expect(result.themeName).toBeNull();
    expect(result.warning).toContain("Theme file is corrupted");

    const files = await readdir(dir);
    expect(files.some((name) => name.startsWith("theme.json.corrupt-"))).toBe(true);
  });
});
