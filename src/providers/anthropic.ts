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
    onStream?: (text: string) => void
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

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: anthropicMessages as any,
    });

    let text = "";
    const content: ContentBlock[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
        if (onStream) onStream(block.text);
        content.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        content.push({ type: "tool_use", id: block.id, name: block.name, input: block.input as Record<string, unknown> });
        toolCalls.push({ id: block.id, name: block.name, input: block.input as Record<string, unknown> });
      }
    }

    const stopReason = response.stop_reason === "tool_use" ? "tool_use" : "end_turn";
    return { content, text, stopReason: stopReason as StreamingResponse["stopReason"], toolCalls };
  }
}
