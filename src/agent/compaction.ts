import type { ProviderClient, ContentBlock } from "../providers/types";
import { contextWindowFor } from "./context";
import type { LoopMessage } from "./loop";

const COMPACT_AT = 0.75;   // compact when est. tokens exceed this fraction of the window
const KEEP_RECENT = 6;     // most-recent messages kept verbatim
const CHARS_PER_TOKEN = 4; // rough estimate

const SUMMARIZER_SYSTEM =
  "You compress a coding-session transcript into a dense summary for the agent to continue from. " +
  "Capture: the user's goal, key decisions, files created/modified and how, commands run and their outcomes, " +
  "and any open problems or next steps. Be specific with file paths and names. Output only the summary.";

function blockText(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .map((b) => (b.type === "tool_use" ? `[tool ${b.name}] ${b.text ?? ""}` : (b as any).text ?? ""))
    .join("\n");
}

/** Rough token estimate for the whole message list. */
export function estimateTokens(messages: LoopMessage[]): number {
  let chars = 0;
  for (const m of messages) chars += blockText(m.content).length;
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

export function shouldCompact(messages: LoopMessage[], model?: string): boolean {
  if (messages.length <= KEEP_RECENT + 2) return false;
  return estimateTokens(messages) >= contextWindowFor(model) * COMPACT_AT;
}

async function summarize(provider: ProviderClient, messages: LoopMessage[], signal?: AbortSignal): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${blockText(m.content)}`)
    .join("\n\n")
    .slice(0, 60_000); // guard the summarizer's own input size

  const res = await provider.chat(
    [{ role: "user", content: `Summarize this transcript so work can continue:\n\n${transcript}` }],
    SUMMARIZER_SYSTEM,
    [],
    undefined,
    signal
  );
  return res.text.trim();
}

interface CompactCtx {
  provider: ProviderClient;
  model?: string;
  usage: { inputTokens: number; outputTokens: number };
  signal?: AbortSignal;
}

/**
 * If the conversation is approaching the context window, replace older messages
 * with a single summary, keeping the most recent turns verbatim.
 * Returns null when no compaction is needed.
 */
export async function maybeCompact(
  messages: LoopMessage[],
  ctx: CompactCtx
): Promise<{ messages: LoopMessage[]; summary: string } | null> {
  if (!shouldCompact(messages, ctx.model)) return null;
  return compactNow(messages, ctx.provider, ctx.signal);
}

/** Force a compaction regardless of size (used by the `/compact` command). */
export async function compactNow(
  messages: LoopMessage[],
  provider: ProviderClient,
  signal?: AbortSignal
): Promise<{ messages: LoopMessage[]; summary: string } | null> {
  if (messages.length <= KEEP_RECENT + 1) return null;
  const head = messages.slice(0, messages.length - KEEP_RECENT);
  const tail = messages.slice(messages.length - KEEP_RECENT);
  const summary = await summarize(provider, head, signal);
  const summaryMsg: LoopMessage = {
    role: "user",
    content: `<conversation-summary>\n${summary}\n</conversation-summary>`,
  };
  return { messages: [summaryMsg, ...tail], summary };
}
