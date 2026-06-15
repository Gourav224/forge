import type { ProviderClient, ContentBlock, StreamingResponse, ToolCall } from "./types";

export class OllamaProvider implements ProviderClient {
  private baseUrl: string;
  private modelId: string;

  constructor(modelId = "mistral", baseUrl = "http://localhost:11434") {
    this.modelId = modelId;
    this.baseUrl = baseUrl;
  }

  private injectToolsIntoSystem(system: string, tools: any[]): string {
    if (tools.length === 0) return system;
    const list = tools
      .map((t) => `- ${t.name}: ${t.description}\n  params: ${JSON.stringify(t.input_schema?.properties || {})}`)
      .join("\n");
    return `${system}

You have access to tools. To call a tool respond with ONLY valid JSON (no other text):
{"tool": "<name>", "input": {<params>}}

Tools:
${list}

For plain answers that don't need a tool, respond with normal text.`;
  }

  async chat(
    messages: Array<{ role: string; content: string | ContentBlock[] }>,
    systemPrompt: string,
    tools: any[],
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamingResponse> {
    const system = this.injectToolsIntoSystem(systemPrompt, tools);
    const ollamaMessages: any[] = [{ role: "system", content: system }];

    for (const m of messages) {
      if (typeof m.content === "string") {
        ollamaMessages.push({ role: m.role, content: m.content });
      } else {
        const toolResults = m.content.filter((b) => b.type === "tool_use" && b.text);
        if (m.role === "user" && toolResults.length > 0) {
          const text = toolResults.map((b) => `Tool result for ${b.name}:\n${b.text}`).join("\n\n");
          ollamaMessages.push({ role: "user", content: text });
        } else {
          const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("");
          ollamaMessages.push({ role: m.role, content: text });
        }
      }
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.modelId, messages: ollamaMessages, stream: true }),
      signal,
    });

    if (!response.ok) throw new Error(`Ollama error ${response.status}: ${response.statusText}`);

    let text = "";
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    let lineBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += new TextDecoder().decode(value);
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) { text += parsed.message.content; if (onStream) onStream(parsed.message.content); }
          } catch { /* skip */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Detect JSON tool call in response
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.tool && typeof parsed.tool === "string") {
          const id = `call_${Date.now()}`;
          const input = parsed.input || {};
          const toolCall: ToolCall = { id, name: parsed.tool, input };
          return {
            content: [{ type: "tool_use", id, name: parsed.tool, input }],
            text: "",
            stopReason: "tool_use",
            toolCalls: [toolCall],
          };
        }
      } catch { /* plain text */ }
    }

    const content: ContentBlock[] = text ? [{ type: "text", text }] : [];
    return { content, text, stopReason: "end_turn", toolCalls: [] };
  }
}
