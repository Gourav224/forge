import type { ProviderClient, ContentBlock } from "./providers/types";
import { TOOLS, executeTool } from "./tools/index";

export async function runAgent(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  onStream?: (text: string) => void,
  existingMessages?: Array<{ role: string; content: string }>
): Promise<string> {
  const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
    ...(existingMessages || []),
    { role: "user", content: prompt },
  ];

  let finalText = "";

  while (true) {
    const response = await provider.chat(messages, systemPrompt, TOOLS as any[], onStream);
    finalText += response.text;

    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break;

    // Execute all tool calls and collect results
    const toolResults: ContentBlock[] = [];
    for (const toolCall of response.toolCalls) {
      const result = await executeTool({ name: toolCall.name, input: toolCall.input });
      toolResults.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input, text: result });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalText;
}
