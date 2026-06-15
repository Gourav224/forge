// Context-window sizes per model family, used for the status-bar meter and to
// decide when to compact. Matched by substring against the model id.

const WINDOWS: Array<[string, number]> = [
  ["claude-3-5", 200_000],
  ["claude-3-7", 200_000],
  ["claude-sonnet", 200_000],
  ["claude-opus", 200_000],
  ["claude-haiku", 200_000],
  ["claude", 200_000],
  ["gpt-4o", 128_000],
  ["gpt-4-turbo", 128_000],
  ["gpt-4.1", 1_000_000],
  ["o1", 200_000],
  ["o3", 200_000],
  ["gpt-4", 8_192],
  ["gpt-3.5", 16_385],
  ["llama", 8_192],
  ["mistral", 32_000],
  ["qwen", 32_000],
];

const DEFAULT_WINDOW = 128_000;

export function contextWindowFor(model?: string): number {
  if (!model) return DEFAULT_WINDOW;
  const id = model.toLowerCase();
  for (const [needle, size] of WINDOWS) {
    if (id.includes(needle)) return size;
  }
  return DEFAULT_WINDOW;
}

/** Percentage of the model's context window estimated to be in use (0–100). */
export function usedPct(tokens: number, model?: string): number {
  if (tokens <= 0) return 0;
  return Math.min(100, Math.round((tokens / contextWindowFor(model)) * 100));
}
