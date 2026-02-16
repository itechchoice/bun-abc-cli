import { afterEach, describe, expect, test } from "bun:test";
import { PlatformApiClient } from "./client";

type FetchImpl = typeof fetch;
const originalFetch: FetchImpl = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("PlatformApiClient", () => {
  test("parses success json and injects bearer token", async () => {
    let authHeader = "";

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      authHeader = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as FetchImpl;

    const client = new PlatformApiClient("https://example.com/api/v1");
    const response = await client.listMcp("token-123");

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(authHeader).toBe("Bearer token-123");
  });

  test("keeps json body on http error", async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ status: 404, message: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as FetchImpl;

    const client = new PlatformApiClient("https://example.com/api/v1");
    const response = await client.getMcp("token", 9);

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ status: 404, message: "not found" });
  });

  test("falls back to raw_text for non-json response", async () => {
    globalThis.fetch = (async () => {
      return new Response("<html>gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });
    }) as unknown as FetchImpl;

    const client = new PlatformApiClient("https://example.com/api/v1");
    const response = await client.request("GET", "/sessions", { token: "token" });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      raw_text: "<html>gateway</html>",
      content_type: "text/html",
    });
  });

  test("calls auth refresh with refresh_token body", async () => {
    let postedBody = "";
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      postedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ access_token: "new-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as FetchImpl;

    const client = new PlatformApiClient("https://example.com/api/v1");
    const response = await client.refreshToken("refresh-123");

    expect(response.ok).toBe(true);
    expect(JSON.parse(postedBody)).toEqual({ refresh_token: "refresh-123" });
  });

  test("builds task list query parameters", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input.toString();
      return new Response(JSON.stringify({ items: [], total: 0, page: 1, size: 20 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as FetchImpl;

    const client = new PlatformApiClient("https://example.com/api/v1");
    const response = await client.listTasks("token-1", { status: "RUNNING", page: 2, size: 10 });

    expect(response.ok).toBe(true);
    expect(requestedUrl).toContain("/tasks?status=RUNNING&page=2&size=10");
  });
});
