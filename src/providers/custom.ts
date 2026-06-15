import type { ProviderClient, ContentBlock, StreamingResponse } from "./types";

export class CustomProvider implements ProviderClient {
  private endpoint: string;
  private apiKey?: string;
  private modelId: string;
  private format: "openai" | "ollama";

  constructor(endpoint: string, modelId: string, apiKey?: string, format: "openai" | "ollama" = "openai") {
    this.endpoint = endpoint;
    this.modelId = modelId;
    this.apiKey = apiKey;
    this.format = format;
  }

  async chat(
    messages: Array<{ role: string; content: string | ContentBlock[] }>,
    systemPrompt: string,
    _tools: any[],
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamingResponse> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    const body = {
      model: this.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
      ],
      stream: true,
    };

    const response = await fetch(this.endpoint, { method: "POST", headers, body: JSON.stringify(body), signal });
    if (!response.ok) throw new Error(`Custom API error: ${response.status} ${response.statusText}`);

    let text = "";
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    let buf = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += new TextDecoder().decode(value);
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          // Try Ollama NDJSON
          try {
            const p = JSON.parse(line);
            if (p.message?.content) { text += p.message.content; if (onStream) onStream(p.message.content); continue; }
          } catch { /* not Ollama */ }
          // Try OpenAI SSE
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const p = JSON.parse(data);
              const chunk = p.choices?.[0]?.delta?.content;
              if (chunk) { text += chunk; if (onStream) onStream(chunk); }
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const content: ContentBlock[] = text ? [{ type: "text", text }] : [];
    return { content, text, stopReason: "end_turn", toolCalls: [] };
  }
}
