import { runLoop } from "./loop";
import { TOOLS } from "../tools/index";
import { READONLY_TOOLS } from "./modes";
import { resolveProvider } from "../providers/index";
import { subagentExplorePrompt } from "../prompts/index";

// The active model string is set once at startup so the `task` tool can resolve
// its own provider without threading it through the tool executor.
let activeModel = "anthropic:claude-3-5-sonnet-20241022";

export function setSubagentModel(model: string): void {
  if (model) activeModel = model;
}

/**
 * Run a focused, read-only sub-agent on a single self-contained task and return
 * its final text. Depth-guarded so a sub-agent cannot spawn further sub-agents.
 */
export async function runSubagent(task: string, signal?: AbortSignal): Promise<string> {
  if (!task || !task.trim()) return "Error: the task tool needs a non-empty prompt.";

  let provider;
  try {
    provider = resolveProvider(activeModel).provider;
  } catch (e) {
    return `Sub-agent could not start: ${e instanceof Error ? e.message : String(e)}`;
  }

  const tools = (TOOLS as Array<{ name: string }>).filter((t) => READONLY_TOOLS.has(t.name));

  try {
    const { text } = await runLoop(
      [{ role: "user", content: task }],
      {
        provider,
        systemPrompt: subagentExplorePrompt,
        tools,
        mode: "auto",        // no approval prompts; tools are read-only anyway
        model: activeModel,
        signal,
        depth: 1,
        noModePrompt: true,
      }
    );
    return text || "(sub-agent returned no output)";
  } catch (e) {
    return `Sub-agent error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
