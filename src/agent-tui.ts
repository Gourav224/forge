import { randomUUID } from "node:crypto";
import type { ProviderClient, ContentBlock, TokenUsage } from "./providers/types";
import { TOOLS, executeTool } from "./tools/index";
import { getSetting } from "./db/index";

interface TuiCallbacks {
  onText: (chunk: string) => void;
  onToolStart: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolDone: (id: string, result: string) => void;
  onUsage?: (usage: TokenUsage) => void;
}

export async function runAgentTui(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  existingMessages: Array<{ role: string; content: string }>,
  callbacks: TuiCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
    ...existingMessages,
    { role: "user", content: prompt },
  ];

  const maxIter = Number(getSetting("agent.max_iterations") ?? 40);
  let iter = 0;
  let finalText = "";
  let totalInput = 0;
  let totalOutput = 0;

  while (true) {
    if (signal?.aborted) break;
    if (++iter > maxIter) {
      callbacks.onText(`\n\n[forge: reached max iterations (${maxIter}). Stopping.]\n`);
      break;
    }

    const response = await provider.chat(messages, systemPrompt, TOOLS as any[], callbacks.onText, signal);
    finalText += response.text;

    if (response.usage) {
      totalInput += response.usage.inputTokens;
      totalOutput += response.usage.outputTokens;
      callbacks.onUsage?.({ inputTokens: totalInput, outputTokens: totalOutput });
    }

    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break;

    const toolResults: ContentBlock[] = [];

    for (const toolCall of response.toolCalls) {
      if (signal?.aborted) break;

      const eventId = toolCall.id || randomUUID();
      callbacks.onToolStart(eventId, toolCall.name, toolCall.input);

      const result = await executeTool({ name: toolCall.name, input: toolCall.input }, signal);

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
