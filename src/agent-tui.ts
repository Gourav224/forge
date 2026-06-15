import { randomUUID } from "node:crypto";
import type { ProviderClient, ContentBlock } from "./providers/types";
import { TOOLS, executeTool } from "./tools/index";

interface TuiCallbacks {
  onText: (chunk: string) => void;
  onToolStart: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolDone: (id: string, result: string) => void;
}

export async function runAgentTui(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  existingMessages: Array<{ role: string; content: string }>,
  callbacks: TuiCallbacks
): Promise<string> {
  const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
    ...existingMessages,
    { role: "user", content: prompt },
  ];

  let finalText = "";

  while (true) {
    const response = await provider.chat(messages, systemPrompt, TOOLS as any[], (chunk) => {
      callbacks.onText(chunk);
    });

    finalText += response.text;

    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break;

    const toolResults: ContentBlock[] = [];

    for (const toolCall of response.toolCalls) {
      const eventId = toolCall.id || randomUUID();
      callbacks.onToolStart(eventId, toolCall.name, toolCall.input);

      const result = await executeTool({ name: toolCall.name, input: toolCall.input });

      callbacks.onToolDone(eventId, result);
      toolResults.push({
        type: "tool_use",
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input,
        text: result,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalText;
}
