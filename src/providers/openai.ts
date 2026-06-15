import type { ProviderClient, ContentBlock, StreamingResponse, ToolCall, TokenUsage } from "./types";

export class OpenAIProvider implements ProviderClient {
  private apiKey: string;
  private baseUrl: string;
  private modelId: string;

  constructor(apiKey: string, modelId = "gpt-4-turbo", baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.baseUrl = baseUrl;
  }

  private convertMessages(messages: Array<{ role: string; content: string | ContentBlock[] }>): any[] {
    const result: any[] = [];
    for (const m of messages) {
      if (typeof m.content === "string") {
        result.push({ role: m.role, content: m.content });
        continue;
      }
      const toolBlocks = m.content.filter((b) => b.type === "tool_use" && b.id);
      if (m.role === "user" && toolBlocks.length > 0) {
        for (const b of toolBlocks) {
          result.push({ role: "tool", tool_call_id: b.id, content: b.text || "" });
        }
      } else if (m.role === "assistant" && toolBlocks.length > 0) {
        result.push({
          role: "assistant",
          content: null,
          tool_calls: toolBlocks.map((b) => ({
            id: b.id,
            type: "function",
            function: { name: b.name, arguments: JSON.stringify(b.input || {}) },
          })),
        });
      } else {
        const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("");
        result.push({ role: m.role, content: text });
      }
    }
    return result;
  }

  async chat(
    messages: Array<{ role: string; content: string | ContentBlock[] }>,
    systemPrompt: string,
    tools: any[],
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamingResponse> {
    const openaiMessages = [{ role: "system", content: systemPrompt }, ...this.convertMessages(messages)];
    const openaiTools = tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.modelId,
        messages: openaiMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        stream: true,
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${err}`);
    }

    let text = "";
    const content: ContentBlock[] = [];
    const toolCalls: ToolCall[] = [];
    const accum: Record<number, { id: string; name: string; arguments: string }> = {};
    let stopReason: StreamingResponse["stopReason"] = "end_turn";
    let usage: TokenUsage | undefined;

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const ev = JSON.parse(data);
            const delta = ev.choices?.[0]?.delta;
            const finish = ev.choices?.[0]?.finish_reason;
            if (finish === "tool_calls") stopReason = "tool_use";
            if (finish === "length") stopReason = "max_tokens";
            if (ev.usage) usage = { inputTokens: ev.usage.prompt_tokens, outputTokens: ev.usage.completion_tokens };
            if (delta?.content) { text += delta.content; if (onStream) onStream(delta.content); }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!accum[idx]) accum[idx] = { id: "", name: "", arguments: "" };
                if (tc.id) accum[idx].id = tc.id;
                if (tc.function?.name) accum[idx].name = tc.function.name;
                if (tc.function?.arguments) accum[idx].arguments += tc.function.arguments;
              }
            }
          } catch { /* skip bad chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    for (const tc of Object.values(accum)) {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(tc.arguments); } catch { input = { _raw: tc.arguments }; }
      toolCalls.push({ id: tc.id, name: tc.name, input });
      content.push({ type: "tool_use", id: tc.id, name: tc.name, input });
    }
    if (text) content.push({ type: "text", text });

    return { content, text, stopReason, toolCalls, usage };
  }
}
