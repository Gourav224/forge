import type { ProviderClient } from "./providers/types";
import { TOOLS } from "./tools/index";
import { runLoop, type LoopMessage } from "./agent/loop";
import { confirm } from "./config/prompt";
import type { AgentMode } from "./agent/modes";

/** CLI adapter over the shared agent loop. Approval is prompted on a TTY only. */
export async function runAgent(
  provider: ProviderClient,
  prompt: string,
  systemPrompt: string,
  onStream?: (text: string) => void,
  existingMessages?: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
  mode: AgentMode = "build",
  model?: string
): Promise<string> {
  const messages: LoopMessage[] = [...(existingMessages || []), { role: "user", content: prompt }];

  const onApproval = process.stdin.isTTY
    ? async (_id: string, name: string, input: Record<string, unknown>) => {
        const summary = String(input.command ?? input.path ?? "").slice(0, 80);
        return confirm(`\n  ⚠ Allow ${name}${summary ? ` (${summary})` : ""}?`, false);
      }
    : undefined;

  const { text } = await runLoop(messages, {
    provider,
    systemPrompt,
    tools: TOOLS as Array<{ name: string }>,
    mode,
    model,
    signal,
    hooks: { onText: onStream, onApproval },
  });
  return text;
}
