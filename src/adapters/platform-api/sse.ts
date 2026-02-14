import type { ApiResponse, SseEventRecord } from "./types";

interface SubscribeTaskEventsOptions {
  baseUrl: string;
  token: string;
  taskId: number;
  signal?: AbortSignal;
  onOpen?: (response: ApiResponse) => void;
  onEvent: (record: SseEventRecord) => void;
}

interface ParsedEvent {
  event: string;
  data: string;
}

export class SseHttpError extends Error {
  readonly response: ApiResponse;

  constructor(response: ApiResponse) {
    super(`SSE request failed with status ${response.status}`);
    this.response = response;
  }
}

function tryParseJson(raw: string): unknown {
  const text = raw.trim();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw_text: raw, content_type: "text/plain" };
  }
}

function parseBufferChunk(buffer: string): { records: ParsedEvent[]; rest: string } {
  const records: ParsedEvent[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const segments = normalized.split("\n\n");
  const rest = segments.pop() ?? "";

  for (const segment of segments) {
    const lines = segment.split("\n");
    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim() || "message";
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    records.push({
      event,
      data: dataLines.join("\n"),
    });
  }

  return { records, rest };
}

export async function subscribeTaskEvents(options: SubscribeTaskEventsOptions): Promise<void> {
  const path = `/tasks/${options.taskId}/events`;
  const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "text/event-stream",
    },
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const text = await response.text();
    const errorResponse: ApiResponse = {
      method: "GET",
      path,
      status: response.status,
      ok: false,
      contentType,
      body: contentType.includes("application/json") ? tryParseJson(text) : {
        raw_text: text,
        content_type: contentType,
      },
    };
    throw new SseHttpError(errorResponse);
  }

  const openResponse: ApiResponse = {
    method: "GET",
    path,
    status: response.status,
    ok: true,
    contentType,
    body: null,
  };
  options.onOpen?.(openResponse);

  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseBufferChunk(buffer);
    buffer = parsed.rest;

    for (const record of parsed.records) {
      options.onEvent({
        event: record.event,
        data: tryParseJson(record.data),
      });
    }
  }

  const tail = decoder.decode();
  if (tail) {
    buffer += tail;
  }

  const parsedTail = parseBufferChunk(buffer);
  for (const record of parsedTail.records) {
    options.onEvent({
      event: record.event,
      data: tryParseJson(record.data),
    });
  }
}
