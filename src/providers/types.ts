export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface StreamingResponse {
  content: ContentBlock[];
  text: string;
  stopReason: "end_turn" | "tool_use" | "max_tokens";
  toolCalls: ToolCall[];
}

export interface ProviderClient {
  chat(
    messages: Array<{ role: string; content: string | ContentBlock[] }>,
    systemPrompt: string,
    tools: any[],
    onStream?: (text: string) => void
  ): Promise<StreamingResponse>;
}
