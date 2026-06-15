export async function httpFetch(url: string, maxBytes = 20_000): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return `HTTP ${response.status} ${response.statusText}`;
    const text = await response.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) + `\n...(truncated, ${text.length} total bytes)` : text;
  } catch (error) {
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
