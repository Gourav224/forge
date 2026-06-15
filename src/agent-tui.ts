import type { ProviderClient, TokenUsage } from "./providers/types";
import { TOOLS } from "./tools/index";
import { runLoop, type LoopMessage } from "./agent/loop";
import { setSubagentModel } from "./agent/subagent";
import type { AgentMode } from "./agent/modes";

interface TuiCallbacks {
  onText: (chunk: string) => void;
  onToolStart: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolDone: (id: string, result: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  onContext?: (tokens: number) => void;
  onApproval?: (id: string, name: string, input: Record<string, unknown>) => Promise<boolean>;
  onCompact?: (summary: string) => void;
}

/** TUI adapter over the shared agent loop. */
export async function runAgentTui(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  existingMessages: Array<{ role: string; content: string }>,
  callbacks: TuiCallbacks,
  signal?: AbortSignal,
  mode: AgentMode = "build",
  model?: string
): Promise<string> {
  if (model) setSubagentModel(model);
  const messages: LoopMessage[] = [...existingMessages, { role: "user", content: prompt }];
  const { text } = await runLoop(messages, {
    provider,
    systemPrompt,
    tools: TOOLS as Array<{ name: string }>,
    mode,
    model,
    signal,
    hooks: {
      onText: callbacks.onText,
      onToolStart: callbacks.onToolStart,
      onToolDone: callbacks.onToolDone,
      onUsage: callbacks.onUsage,
      onContext: callbacks.onContext,
      onApproval: callbacks.onApproval,
      onCompact: callbacks.onCompact,
    },
  });
  return text;
}
