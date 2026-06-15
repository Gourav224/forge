import type { ProviderClient, ContentBlock } from "./providers/types";
import { TOOLS, executeTool } from "./tools/index";
import { getSetting } from "./db/index";

export async function runAgent(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  onStream?: (text: string) => void,
  existingMessages?: Array<{ role: string; content: string }>,
  signal?: AbortSignal
): Promise<string> {
  const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
    ...(existingMessages || []),
    { role: "user", content: prompt },
  ];

  const maxIter = Number(getSetting("agent.max_iterations") ?? 40);
  let iter = 0;
  let finalText = "";

  while (true) {
    if (signal?.aborted) break;
    if (++iter > maxIter) {
      const notice = `\n\n[forge: reached max iterations (${maxIter}). Stopping.]\n`;
      finalText += notice;
      if (onStream) onStream(notice);
      break;
    }

    const response = await provider.chat(messages, systemPrompt, TOOLS as any[], onStream, signal);
    finalText += response.text;

    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break;

    const toolResults: ContentBlock[] = [];
    for (const toolCall of response.toolCalls) {
      if (signal?.aborted) break;
      const result = await executeTool({ name: toolCall.name, input: toolCall.input }, signal);
      toolResults.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input, text: result });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalText;
}
