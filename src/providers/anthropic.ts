import Anthropic from "@anthropic-ai/sdk";
import type { ProviderClient, ContentBlock, StreamingResponse, ToolCall } from "./types";

export class AnthropicProvider implements ProviderClient {
  private client: Anthropic;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "claude-3-5-sonnet-20241022") {
    this.client = new Anthropic({ apiKey });
    this.modelId = modelId;
  }

  async chat(
    messages: Array<{ role: string; content: string | ContentBlock[] }>,
    systemPrompt: string,
    tools: any[],
    onStream?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamingResponse> {
    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        typeof m.content === "string"
          ? m.content
          : m.content.map((c) => {
              if (c.type === "text") return { type: "text" as const, text: c.text };
              if (c.type === "tool_use") {
                return { type: "tool_result" as const, tool_use_id: c.id, content: c.text || "" };
              }
              return { type: "text" as const, text: "" };
            }),
    }));

    let text = "";
    const content: ContentBlock[] = [];
    const toolCalls: ToolCall[] = [];

    try {
      const stream = this.client.messages.stream({
        model: this.modelId,
        max_tokens: 8096,
        system: systemPrompt,
        tools,
        messages: anthropicMessages as any,
      });

      // Wire abort signal to stream
      if (signal) {
        signal.addEventListener("abort", () => stream.abort(), { once: true });
      }

      stream.on("text", (chunk) => {
        text += chunk;
        if (onStream) onStream(chunk);
      });

      const message = await stream.finalMessage();

      for (const block of message.content) {
        if (block.type === "text") {
          content.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          const input = block.input as Record<string, unknown>;
          content.push({ type: "tool_use", id: block.id, name: block.name, input });
          toolCalls.push({ id: block.id, name: block.name, input });
        }
      }

      const stopReason =
        message.stop_reason === "tool_use" ? "tool_use"
        : message.stop_reason === "max_tokens" ? "max_tokens"
        : "end_turn";

      return { content, text, stopReason: stopReason as StreamingResponse["stopReason"], toolCalls };
    } catch (err: any) {
      if (signal?.aborted || err?.name === "AbortError" || err?.message?.includes("aborted")) {
        return { content, text, stopReason: "aborted", toolCalls };
      }
      throw err;
    }
  }
}
