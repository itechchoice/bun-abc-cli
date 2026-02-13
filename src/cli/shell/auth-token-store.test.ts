import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "./auth-token-store";

const allocatedDirs: string[] = [];

async function withTempStoreHome(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "abc-cli-auth-token-test-"));
  allocatedDirs.push(dir);
  process.env.ABC_CLI_HOME = dir;
  return dir;
}

afterEach(async () => {
  delete process.env.ABC_CLI_HOME;
  while (allocatedDirs.length > 0) {
    const dir = allocatedDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("auth-token-store", () => {
  test("saves and loads token", async () => {
    await withTempStoreHome();
    await saveAuthToken("mock-token-demo");
    const token = await loadAuthToken();
    expect(token).toBe("mock-token-demo");
  });

  test("clears token file", async () => {
    const dir = await withTempStoreHome();
    await saveAuthToken("mock-token-demo");
    await clearAuthToken();
    const token = await loadAuthToken();
    expect(token).toBeNull();
    const tokenPath = path.join(dir, "auth-token.json");
    await expect(readFile(tokenPath, "utf8")).rejects.toBeDefined();
  });
});
