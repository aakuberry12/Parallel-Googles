import type { AppConfig, SearchRequest, StreamEvent } from "../../shared/types";

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("The server is not responding. Is it running on port 3001?");
  return res.json();
}

/** POSTs a search and reports each newline-delimited event as it arrives. */
export async function runSearch(req: SearchRequest, onEvent: (e: StreamEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "The search could not be started.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
  }
}
