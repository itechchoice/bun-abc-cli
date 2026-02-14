import { afterEach, describe, expect, test } from "bun:test";
import { SseHttpError, subscribeTaskEvents } from "./sse";
import type { SseEventRecord } from "./types";

type FetchImpl = typeof fetch;
const originalFetch: FetchImpl = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("subscribeTaskEvents", () => {
  test("parses chunked sse events", async () => {
    const records: SseEventRecord[] = [];
    const encoder = new TextEncoder();

    globalThis.fetch = (async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("event: task.created\n"));
          controller.enqueue(encoder.encode("data: {\"task_id\":1}\n\n"));
          controller.enqueue(encoder.encode("event: heartbeat\n"));
          controller.enqueue(encoder.encode("data: {\"timestamp\":\"2026-01-01T00:00:00Z\"}\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as unknown as FetchImpl;

    await subscribeTaskEvents({
      baseUrl: "https://example.com/api/v1",
      token: "token",
      taskId: 1,
      onEvent: (record) => {
        records.push(record);
      },
    });

    expect(records).toEqual([
      { event: "task.created", data: { task_id: 1 } },
      { event: "heartbeat", data: { timestamp: "2026-01-01T00:00:00Z" } },
    ]);
  });

  test("throws SseHttpError on non-2xx", async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ status: 401, message: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as FetchImpl;

    await expect(subscribeTaskEvents({
      baseUrl: "https://example.com/api/v1",
      token: "bad-token",
      taskId: 9,
      onEvent: () => {
        // no-op
      },
    })).rejects.toBeInstanceOf(SseHttpError);
  });
});
