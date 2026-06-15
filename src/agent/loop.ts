import { randomUUID } from "node:crypto";
import type { ProviderClient, ContentBlock, TokenUsage } from "../providers/types";
import { executeTool } from "../tools/index";
import { getSetting } from "../db/index";
import { toolsForMode, modePrompt, needsApproval, type AgentMode } from "./modes";
import { maybeCompact, estimateTokens } from "./compaction";

export type LoopMessage = { role: string; content: string | ContentBlock[] };

export interface LoopHooks {
  onText?: (chunk: string) => void;
  onToolStart?: (id: string, name: string, input: Record<string, unknown>) => void;
  onToolDone?: (id: string, result: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  /** Current context-window fill in tokens (≈ last request's input size). */
  onContext?: (tokens: number) => void;
  /** Return false to deny a risky tool. If omitted, risky tools run without asking. */
  onApproval?: (id: string, name: string, input: Record<string, unknown>) => Promise<boolean>;
  /** Notified when the conversation is compacted. */
  onCompact?: (summary: string) => void;
}

export interface LoopOptions {
  provider: ProviderClient;
  systemPrompt: string;
  tools: Array<{ name: string }>;
  model?: string;
  mode?: AgentMode;
  signal?: AbortSignal;
  hooks?: LoopHooks;
  /** Depth guard for sub-agents — when > 0, the `task` tool is unavailable. */
  depth?: number;
  /** Skip appending the mode-specific prompt (used by sub-agents). */
  noModePrompt?: boolean;
}

export interface LoopResult {
  text: string;
  usage: TokenUsage;
  messages: LoopMessage[];
}

/**
 * The core agent loop shared by the CLI and the TUI. Drives the
 * call-LLM → run-tools → repeat cycle, applying mode tool-filtering,
 * permission gating, and context compaction.
 */
export async function runLoop(messages: LoopMessage[], opts: LoopOptions): Promise<LoopResult> {
  const mode: AgentMode = opts.mode ?? "build";
  const hooks = opts.hooks ?? {};

  let tools = toolsForMode(mode, opts.tools);
  // Sub-agents cannot spawn sub-agents.
  if ((opts.depth ?? 0) > 0) tools = tools.filter((t) => t.name !== "task");

  const system = opts.systemPrompt + (opts.noModePrompt ? "" : modePrompt(mode));
  const maxIter = Number(getSetting("agent.max_iterations") ?? 40);

  let iter = 0;
  let finalText = "";
  let totalInput = 0;
  let totalOutput = 0;

  while (true) {
    if (opts.signal?.aborted) break;
    if (++iter > maxIter) {
      hooks.onText?.(`\n\n[forge: reached max iterations (${maxIter}). Stopping.]\n`);
      break;
    }

    // Compact older history if we're approaching the context window.
    const compacted = await maybeCompact(messages, {
      provider: opts.provider,
      model: opts.model,
      usage: { inputTokens: totalInput, outputTokens: totalOutput },
      signal: opts.signal,
    });
    if (compacted) {
      messages = compacted.messages;
      hooks.onCompact?.(compacted.summary);
    }

    const response = await opts.provider.chat(messages, system, tools as any[], hooks.onText, opts.signal);
    finalText += response.text;

    if (response.usage) {
      totalInput += response.usage.inputTokens;
      totalOutput += response.usage.outputTokens;
      hooks.onUsage?.({ inputTokens: totalInput, outputTokens: totalOutput });
    }
    hooks.onContext?.(response.usage?.inputTokens ?? estimateTokens(messages));

    if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break;

    const toolResults: ContentBlock[] = [];
    for (const toolCall of response.toolCalls) {
      if (opts.signal?.aborted) break;
      const eventId = toolCall.id || randomUUID();

      // Permission gate for risky tools.
      if (needsApproval(mode, toolCall.name) && hooks.onApproval) {
        const approved = await hooks.onApproval(eventId, toolCall.name, toolCall.input);
        if (!approved) {
          hooks.onToolStart?.(eventId, toolCall.name, toolCall.input);
          const denied = `Denied by user. The "${toolCall.name}" action was not run. Adjust your approach or ask the user how to proceed.`;
          hooks.onToolDone?.(eventId, denied);
          toolResults.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input, text: denied });
          continue;
        }
      }

      hooks.onToolStart?.(eventId, toolCall.name, toolCall.input);
      const result = await executeTool({ name: toolCall.name, input: toolCall.input }, opts.signal);
      hooks.onToolDone?.(eventId, result);
      toolResults.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input, text: result });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return {
    text: finalText,
    usage: { inputTokens: totalInput, outputTokens: totalOutput },
    messages,
  };
}
