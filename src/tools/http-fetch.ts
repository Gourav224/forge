const DEFAULT_TIMEOUT_MS = 15_000;

export async function httpFetch(
  url: string,
  maxBytes = 20_000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<string> {
  try {
    const combined = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);

    const response = await fetch(url, { signal: combined });
    if (!response.ok) return `HTTP ${response.status} ${response.statusText}`;
    const text = await response.text();
    return text.length > maxBytes
      ? text.slice(0, maxBytes) + `\n...(truncated, ${text.length} total bytes)`
      : text;
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return `Error: request timed out after ${timeoutMs / 1000}s (${url})`;
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export const httpFetchTool = {
  name: "http_fetch",
  description: "Fetch the content of a URL. Useful for reading docs, APIs, or web pages.",
  input_schema: {
    type: "object" as const,
    properties: {
      url: { type: "string", description: "URL to fetch" },
    },
    required: ["url"],
  },
};
